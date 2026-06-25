// One-time helper: generate a bcrypt hash of the test password.
// Run from your project folder (where bcrypt is installed):
//     node make-hash.js
// Copy the printed hash and paste it over every __BCRYPT_HASH__ in seed.sql

import bcrypt from 'bcrypt';

const password = 'P@$$w0rd!';
const hash = await bcrypt.hash(password, 10);

console.log('Password :', password);
console.log('Hash     :', hash);
console.log('Verify   :', await bcrypt.compare(password, hash)); // should be true
