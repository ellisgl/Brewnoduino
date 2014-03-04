/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', 
    {
        title: 'Brewnoduino',
        config: req.app.get('cfg')
    });
};