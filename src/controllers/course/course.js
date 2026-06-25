import { getAllCourses, getCourseBySlug } from '../../models/course/course-list.js';
import { getSectionsByCourseSlug } from '../../models/course/course-detail.js';

// Route handler for the course list page
const courseListPage = async (req, res, next) => {
    try {
        const courseList = await getAllCourses();

        res.render('course/course-list', {
            title: 'Courses',
            courses: courseList
        });
    } catch (err) {
        next(err);
    }
};

// Route handler for individual course detail pages
const courseDetailPage = async (req, res, next) => {
    try {
        const courseSlug = req.params.courseSlug;

        // Changed variable name from courseDetail to course
        const course = await getCourseBySlug(courseSlug);

        // Check if the database object came back empty
        if (!course || Object.keys(course).length === 0) {
            const err = new Error(`Course ${courseSlug} not found`);
            err.status = 404;
            return next(err);
        }

        const sortBy = req.query.sort || 'time';
        const sections = await getSectionsByCourseSlug(courseSlug, sortBy);

        // Now these variables point to an existing, loaded object!
        res.render('course/course-detail', {
            title: `${course.courseCode} - ${course.name}`,
            course: course,
            sections: sections,
            currentSort: sortBy
        });
    } catch (err) {
        next(err);
    }
};

export { courseListPage, courseDetailPage };
