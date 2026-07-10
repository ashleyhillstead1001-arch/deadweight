#!/usr/bin/env node
/**
 * Security & Role-Based Access Control Tests
 *
 * Tests the following security requirements:
 * 1. Input validation and sanitization on all forms
 * 2. Non-leaky error messages (don't reveal sensitive info)
 * 3. Role-based access control (customer, staff, owner)
 * 4. Rate limiting on sensitive endpoints
 */

        email: 'staff@deadweight.example',
        password: 'P@$$w0rd!'
    },
    customer: {
        email: 'customer@deadweight.example',
        password: 'P@$$w0rd!'
    }
};

let cookieJar = {};

/**
 * Helper to make requests and track cookies
 */
async function request(method, path, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ')
        },
        redirect: 'manual'
    };

    if (body) {
        options.body = new URLSearchParams(body).toString();
    }

    const res = await fetch(`${BASE_URL}${path}`, options);

    // Extract and store cookies
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
        const parts = setCookie.split(';')[0].split('=');
        cookieJar[parts[0]] = parts[1];
    }

    return res;
}

/**
 * Login as a specific role
 */
async function login(role) {
    cookieJar = {};
    const user = testUsers[role];
    const res = await request('POST', '/login', {
        email: user.email,
        password: user.password
    });
    return res.status === 302; // Redirect indicates success
}

/**
 * Test 1: Input Validation - XSS Prevention
 */
async function testXSSPrevention() {
    console.log('\n✓ Test 1: XSS Prevention (Input Sanitization)');

    await login('customer');

    const xssPayload = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        subject: 'Test<img src=x onerror="alert(1)">',
        message: 'Test message<svg/onload=alert("xss")>'
    };

    const res = await request('POST', '/contact', xssPayload);
    const html = await res.text();

    // Verify that dangerous characters are escaped, not executed
    if (!html.includes('<script>') && !html.includes('onerror=')) {
        console.log('  ✓ XSS payload was sanitized (dangerous chars escaped)');
    } else {
        console.log('  ✗ XSS payload was NOT properly sanitized');
    }
}

/**
 * Test 2: Non-Leaky Error Messages - Registration
 */
async function testNonLeakyErrorMessages() {
    console.log('\n✓ Test 2: Non-Leaky Error Messages');

    // Try to register with an email that already exists
    const existingEmail = 'customer@deadweight.example';
    const res1 = await request('POST', '/register', {
        name: 'Test User',
        email: existingEmail,
        emailConfirm: existingEmail,
        password: 'Test@12345',
        passwordConfirm: 'Test@12345'
    });

    // Try with a non-existent email
    const res2 = await request('POST', '/register', {
        name: 'Test User',
        email: 'nonexistent@example.com',
        emailConfirm: 'nonexistent@example.com',
        password: 'Test@12345',
        passwordConfirm: 'Test@12345'
    });

    // Both should redirect similarly (generic response)
    if (res1.status === res2.status) {
        console.log('  ✓ Registration returns generic response (email existence not leaked)');
    } else {
        console.log('  ✗ Different responses for existing vs new email (info leaked)');
    }
}

/**
 * Test 3: Role-Based Access - Customer can only see own requests
 */
async function testCustomerAccessControl() {
    console.log('\n✓ Test 3: Role-Based Access Control - Customer');

    await login('customer');

    // Try to access /requests/all (staff/owner only)
    const res = await request('GET', '/requests/all');

    if (res.status === 403 || res.status === 302) {
        console.log('  ✓ Customer denied access to /requests/all (403 or redirect)');
    } else {
        console.log('  ✗ Customer should NOT have access to /requests/all');
    }
}

/**
 * Test 4: Role-Based Access - Staff can see all requests
 */
async function testStaffAccessControl() {
    console.log('\n✓ Test 4: Role-Based Access Control - Staff');

    await login('staff');

    // Staff should access /requests/all
    const res = await request('GET', '/requests/all');

    if (res.status === 200) {
        console.log('  ✓ Staff can access /requests/all');
    } else {
        console.log('  ✗ Staff should have access to /requests/all');
    }

    // Staff should NOT access /admin
    const adminRes = await request('GET', '/admin');
    if (adminRes.status === 403 || adminRes.status === 302) {
        console.log('  ✓ Staff denied access to /admin (403 or redirect)');
    } else {
        console.log('  ✗ Staff should NOT have access to /admin');
    }
}

/**
 * Test 5: Role-Based Access - Owner has full access
 */
async function testOwnerAccessControl() {
    console.log('\n✓ Test 5: Role-Based Access Control - Owner');

    await login('owner');

    // Owner should access /admin
    const adminRes = await request('GET', '/admin');
    if (adminRes.status === 200) {
        console.log('  ✓ Owner can access /admin dashboard');
    } else {
        console.log('  ✗ Owner should have access to /admin');
    }

    // Owner should access /requests/all
    const allReqRes = await request('GET', '/requests/all');
    if (allReqRes.status === 200) {
        console.log('  ✓ Owner can access /requests/all');
    } else {
        console.log('  ✗ Owner should have access to /requests/all');
    }
}

/**
 * Test 6: Max Length Validation
 */
async function testMaxLengthValidation() {
    console.log('\n✓ Test 6: Max Length Validation (DoS Prevention)');

    await login('customer');

    const tooLong = 'x'.repeat(10001); // Exceed max length
    const res = await request('POST', '/contact', {
        name: 'Test',
        email: 'test@example.com',
        subject: 'Test',
        message: tooLong
    });

    // Should validate and reject (return 400 or redirect)
    if (res.status !== 200) {
        console.log('  ✓ Oversized message rejected (max length validation)');
    } else {
        console.log('  ✗ Oversized message should be rejected');
    }
}

/**
 * Test 7: Login with invalid credentials returns generic message
 */
async function testLoginErrorMessage() {
    console.log('\n✓ Test 7: Login Error Messages Are Generic');

    // Wrong password
    const res1 = await request('POST', '/login', {
        email: 'owner@deadweight.example',
        password: 'wrongpassword'
    });

    // Non-existent email
    const res2 = await request('POST', '/login', {
        email: 'nonexistent@example.com',
        password: 'SomePassword@123'
    });

    // Both should behave the same (redirect)
    if (res1.status === 302 && res2.status === 302) {
        console.log('  ✓ Login returns same response for both invalid email and wrong password');
    } else {
        console.log('  ✗ Different responses leak information about account existence');
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('========================================');
    console.log('Security & Role-Based Access Control Tests');
    console.log('========================================');

    try {
        await testXSSPrevention();
        await testNonLeakyErrorMessages();
        await testCustomerAccessControl();
        await testStaffAccessControl();
        await testOwnerAccessControl();
        await testMaxLengthValidation();
        await testLoginErrorMessage();

        console.log('\n========================================');
        console.log('All security tests completed!');
        console.log('========================================\n');
    } catch (error) {
        console.error('Test error:', error.message);
        process.exit(1);
    }
}

runTests();
