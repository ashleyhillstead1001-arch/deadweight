import { getFacultyBySlug, getSortedFaculty } from '../../models/faculty/faculty.js';

//Route handler for faculty list page
const facultyListPage = async (req, res) => {
    const validSortOptions = ['name', 'department', 'title'];
    const sortBy = validSortOptions.includes(req.query.sort) ? req.query.sort : 'department';
    const facultyList = await getSortedFaculty(sortBy);
    res.render('faculty/faculty-list', {
        title: 'Faculty Members',
        faculty: facultyList,
        currentSort: sortBy
    });
};

//Route handler for individual faculty detail pages
const facultyDetailPage = async (req, res, next) => {
    const facultySlug = req.params.facultySlug;
    const facultyMember = await getFacultyBySlug(facultySlug);

    // If faculty member doesn't exist, create 404 error
    if (Object.keys(facultyMember).length === 0) {
        const err = new Error(`Faculty member ${facultySlug} not found`);
        err.status = 404;
        return next(err);
    }
    res.render('faculty/faculty-detail', {
        title: `${facultyMember.name} - Faculty Profile`,
        faculty: facultyMember
    });
};

export { facultyListPage, facultyDetailPage };
