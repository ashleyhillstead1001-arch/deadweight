// Route handlers for the static marketing pages.
const homePage = (req, res) => {
    res.render('home', { title: 'Home' });
};

const aboutPage = (req, res) => {
    res.render('about', { title: 'About' });
};

const howItWorksPage = (req, res) => {
    res.render('how-it-works', { title: 'How it works' });
};

export { homePage, aboutPage, howItWorksPage };
