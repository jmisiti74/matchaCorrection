var http		= require('http'),
	mysql		= require('mysql'),
	connection	= mysql.createConnection({host:'localhost', socketPath: '/tmp/mysql.sock', port: '3306', user: 'root', password : 'root' }),
	express		= require('express'),
	session		= require('express-session'),
	bodyParser	= require('body-parser'),
	router		= express.Router();
	app			= express(),
	http		= require('http'),
	sio			= require('socket.io')(server),
	utf8		= require('utf8'),
	hasha		= require('hasha'),
	busboy		= require('connect-busboy'),
	path		= require('path'),
	nodemailer	= require('nodemailer'),
	generatePwd	= require('password-generator'),
	fs			= require('fs');

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(busboy());
app.use(session({
	secret: 'jmisiti',
	resave: false,
	saveUninitialized: true,
	cookie: { maxAge: 6000, secure: true }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

var server = app.listen(8888),
	io = require('socket.io').listen(server);
connection.connect();
connection.query('CREATE DATABASE IF NOT EXISTS JM_MATCHA', function (error, results, fields) {
	if (error)
		throw error;
	else
		console.log("\033[0;32mBase de données crée.");
});
connection.query('USE JM_MATCHA', function (error, results, fields) {
	if (error)
		throw error;
});
connection.query('CREATE TABLE IF NOT EXISTS users(id INT AUTO_INCREMENT PRIMARY KEY NOT NULL, visited INT NOT NULL DEFAULT 0, pic INT NOT NULL DEFAULT 0, mail VARCHAR(100) NOT NULL, lon VARCHAR(100) DEFAULT "0", lat VARCHAR(100) DEFAULT "0", name VARCHAR(100), sexe VARCHAR(1) DEFAULT "H", orientation VARCHAR(1), age INT(3), score INT(5) DEFAULT 5, liked int(7) DEFAULT 0, disliked int(7) DEFAULT 0, description TEXT, firstname VARCHAR(100), passwd VARCHAR(200) NOT NULL);', function (error, results, fields) {
	if (error)
		throw error;
	else
		console.log("\033[0;32mTable users crée.");
});
connection.query('CREATE TABLE IF NOT EXISTS imgs(id INT AUTO_INCREMENT PRIMARY KEY NOT NULL, uid INT NOT NULL, path VARCHAR(100));', function (error, results, fields) {
	if (error)
		throw error;
	else
		console.log("\033[0;32mTable imgs crée.");
});
connection.query('CREATE TABLE IF NOT EXISTS tags(id INT AUTO_INCREMENT PRIMARY KEY NOT NULL, uid INT NOT NULL, tag VARCHAR(100));', function (error, results, fields) {
	if (error)
		throw error;
	else
		console.log("\033[0;32mTable tags crée.");
});
connection.query('CREATE TABLE IF NOT EXISTS matchs(id INT AUTO_INCREMENT PRIMARY KEY NOT NULL, uidlike INT NOT NULL, uidliked INT NOT NULL);', function (error, results, fields) {
	if (error)
		throw error;
	else
		console.log("\033[0;32mTable matchs crée.");
});
connection.query('CREATE TABLE IF NOT EXISTS messages(id INT AUTO_INCREMENT PRIMARY KEY NOT NULL, senderid INT NOT NULL, receiverid INT NOT NULL, message TEXT NOT NULL);', function (error, results, fields) {
	if (error)
		throw error;
	else
		console.log("\033[0;32mTable messages crée.\n\033[0;34mSite : localhost:8888");
});
var sess,
	passedVariable;

// Index, page d'accueil
app.get('/', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	passedVariable = req.query ? req.query : null;
	res.render('index', { mail: sess.mail ? sess.mail : "", type: passedVariable.type ? passedVariable.type : "", msg: passedVariable.msg ? passedVariable.msg : "" });
});

app.get('/newpwd', function(req, res) {
	if (!sess.mail)
		res.render('changepwd', { mail: "", type: "" });
	else
		res.redirect('/?type=error&msg=' + utf8.encode("Veuillez vous déconnecté pour effectué cette action."));
});

app.post('/newpwd', function(req, res) {
	if (req.body.mail != null) {
		var transporter = nodemailer.createTransport({
			service: 'Gmail',
			auth: {
				user: 'xjejevbx@gmail.com', // Your email id
				pass: 'qlznualewqzjvzmo' // Your password
			}
		});
		var newpwd = generatePwd();
		var mailOptions = {
			from: 'xjejevbx@gmail.com', // sender address
			to: req.body.mail, // list of receivers
			subject: 'Password reset', // Subject line
			html: 'Votre mot de passe a bien été re-initialiser ✔.<BR />Voici votre nouveau mot de passe : </BR><b>' + newpwd + '</b>' // You can choose to send an HTML body instead
		};
		transporter.sendMail(mailOptions, function(error, info){
			if(error)
				res.redirect('/myaccount?type=error&msg=' + utf8.encode("Une erreur est survenue, veuillez ré-essayer dans quelques minutes."));
			else
			{
				connection.query('UPDATE users SET passwd = ? WHERE mail = ?;', [hasha(newpwd, {algorithm: 'whirlpool'}), req.body.mail], function (er, re, fi) {
					if (error)
						res.redirect('/login?type=error&msg=' + utf8.encode("Une erreur est survenue, veuillez ré-essayer dans quelques minutes."));
					else
						res.redirect('/login?type=ok&msg=' + utf8.encode("Vous allez recevoir votre nouveau mot de passe sur votre boîte mail dans quelques minutes."));
				});
			}
		});
	}
	else
		res.redirect('/?type=error&msg=' + utf8.encode("Une erreur est survenue !"));
});

// match, page de chat entre user
app.get('/match', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	passedVariable = req.query ? req.query : null;
	if (sess && sess.mail)
		res.render('match', { mail: sess.mail, type: "", uid: passedVariable.id, muid: sess.uid });
	else
		res.redirect('/?type=error&msg=' + utf8.encode("Vous devez être connecté."));
});

// Matches, page de listage des matches
app.get('/matches', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	sess.matchs = new Array();
	if (sess && sess.mail)
	{
		connection.query('SELECT * FROM matchs WHERE uidlike = ?;', [sess.uid], function (e, r, f) {
			if (r[0]) {
				r.forEach(function(elem) {
					connection.query('SELECT * FROM matchs WHERE uidlike = ? AND uidliked = ?;', [elem.uidliked, sess.uid], function (err, res, fie) {
						if (res[0])
						{
							connection.query('SELECT * FROM users WHERE id = ?;', [elem.uidliked], function (error, result, field) {
								if (result[0]){
									sess.matchs.push(result[0]);
								}
							});
						}
					});
				});
				res.render('matches', { mail: sess.mail, type: "" });
			}
			else
				res.redirect('/?type=error&msg=' + utf8.encode("Vous n'avez aucun matchs."));
		});
	}
	else
		res.redirect('/?type=error&msg=' + utf8.encode("Vous devez être connecté."));
});

app.get('/profil/me', function(req, res) {
	res.charset = 'utf-8';
	if (sess && sess.mail)
		res.redirect('/profil?fuid=' + sess.uid);
	else
		res.redirect('/?type=error&msg=' + utf8.encode("Vous devez être connecté."));
});

app.get('/score', function(req, res) {
	sess = sess ? sess : req.session;
	res.render('score', { mail: sess.mail, type: "", score: sess.score });
});

// Profil, page de profil de l'utilisateur demandé
app.get('/profil', function(req, res) {
	res.charset = 'utf-8';
	var		mail,
			firstname,
			name,
			sexe,
			description,
			tags,
			age,
			imgs;
	sess = sess ? sess : req.session;
	passedVariable = req.query ? req.query : null;
	if (sess && sess.mail)
	{
		connection.query('SELECT * FROM users WHERE id = "' + passedVariable.fuid + '";', function (error, results, fields) {
			if (results[0]) {
				mail = results[0].mail ? queryBack(results[0].mail) : "";
				firstname = results[0].firstname ? queryBack(results[0].firstname) : "";
				name = results[0].name ? queryBack(results[0].name) : "";
				sexe = results[0].sexe;
				description = results[0].description ? queryBack(results[0].description) : "";
				age = results[0].age ? queryBack(results[0].age) : "";
				score = results[0].score;
				connection.query('SELECT path FROM imgs WHERE uid = ?;', [passedVariable.fuid], function (e, r, f) {
					imgs = r;
					connection.query('SELECT tag FROM tags WHERE uid = ?;', [passedVariable.fuid], function (er, re, fi) {
						tags = re;
						var index = 0;
						re.forEach(function(tag) {
							tags[index] = tag.tag;
							index++;
						});
						if (sess.uid != passedVariable.fuid)
						{
							connection.query('UPDATE users SET visited = visited + 1 WHERE id = ?;', [passedVariable.fuid], function (er, re, fi) {
								if (error)
									console.log("Une erreur est survenue avec le code : " + error);
							});
						}
						if (imgs[0] && tags[0]){
							res.render('profil', { mail: sess.mail, type: "", pmail: mail, pfirstname: firstname, pname: name, psexe: sexe, pdescription: description, ptags: tags, page: age, pimgs: imgs });
						}
						else if (!imgs[0] && tags[0]) {
							res.render('profil', { mail: sess.mail, type: "", pmail: mail, pfirstname: firstname, pname: name, psexe: sexe, pdescription: description, ptags: tags, page: age, pimgs: [] });
						}
						else if (!imgs[0] && !tags[0]) {
							res.render('profil', { mail: sess.mail, type: "", pmail: mail, pfirstname: firstname, pname: name, psexe: sexe, pdescription: description, ptags: [], page: age, pscore: score, pimgs: [] });
						}
						else {
							res.render('profil', { mail: sess.mail, type: "", pmail: mail, pfirstname: firstname, pname: name, psexe: sexe, pdescription: description, ptags: [], page: age, pimgs: imgs });
						}
					});
				});
			}
			else if (error)
				res.redirect('/login?type=error&msg=' + utf8.encode(error.code));
			else
				res.redirect('/?type=error&msg=' + utf8.encode("Utilisateur non trouvé."));
		});
	}
	else
		res.redirect('/?type=error&msg=' + utf8.encode("Vous devez être connecté."));
});

// Déconnexion avec suppression de la session.
app.get('/logout', function(req, res) {
	if (sess && sess.mail)
	{
		sess = [];
		res.redirect('/?type=ok&msg=' + utf8.encode("Vous avez bien été déconnecté."));
	}
	else
		res.redirect('/?type=error&msg=' + utf8.encode("Vous devez être connecté."));
});

// Suppression de l'image envoyer par l'utilisateur de la page Myaccount
app.post('/delete', function(req, res) {
	var imgid = req.body.id;
	sess = sess ? sess : req.session;
	connection.query('DELETE FROM imgs WHERE uid = ? AND path = ?', [sess.uid, sess.imgs[imgid].path], function (error, results, fields) {
		if (error)
			res.redirect('/myaccount?type=error&msg=' + utf8.encode(error.code));
		else
		{
			fs.unlink(__dirname + '/public' + sess.imgs[imgid].path, function(err) {	
				connection.query('SELECT path FROM imgs WHERE uid = ?;', [sess.uid], function (e, r, f) {
					if (r[0])
						sess.imgs = r;
					else
					{
						connection.query('UPDATE users SET pic = 0 WHERE id = ?;', [sess.uid], function (e, r, f) {
							if (e)
								console.log("Une erreur est survenue avec le code :  : " + e);
						});
						sess.imgs = r;
					}
				});
				if (err)
					res.redirect('/myaccount?type=error&msg=' + utf8.encode(err.code));
				else
					res.redirect('/myaccount?type=ok&msg=' + utf8.encode("Votre image a bien été supprimée."));
			});
		}
	});
});

// Récuperation de l'image envoyer par l'utilisateur de la page Myaccount
app.post('/uploads', function(req, res) {
	var fstream;
	var pathimg;
	sess = sess ? sess : req.session;
	req.pipe(req.busboy);
	req.busboy.on('file', function (fieldname, file, filename) {
		if (filename != "")
		{
			if (path.extname(filename) == ".jpg" || path.extname(filename) == ".png")
			{
				pathimg = ('/uploads/img_' + sess.uid + '_' + Math.floor((1 + Math.random() * 999999)) + filename);
				connection.query('SELECT COUNT(*) AS count FROM imgs WHERE uid = ?;', [sess.uid], function (error, results, fields) {
					if (results[0].count < 5)
					{
						fstream = fs.createWriteStream(__dirname + '/public' + pathimg);
						file.pipe(fstream);
						fstream.on('close', function () {
							connection.query('INSERT INTO imgs (uid, path) VALUES ("' + sess.uid + '", "' + pathimg + '");', function (error, results, fields) {
								if (error)
									res.redirect('/myaccount?type=error&msg=' + utf8.encode(error.code));
								else
								{
									connection.query('SELECT path FROM imgs WHERE uid = ?;', [sess.uid], function (e, r, f) {
										sess.imgs = r;
									});
									connection.query('UPDATE users SET pic = 1 WHERE id = ?;', [sess.uid], function (e, r, f) {
										if (e)
											console.log("Une erreur est survenue avec le code :  : " + e);
									});
									res.redirect('/myaccount?type=ok&msg='+ utf8.encode("Votre image a bien été ajoutée."));
								}
							});
						});
					}
					else
						res.redirect('/myaccount?type=error&msg='+ utf8.encode("Vous avez déjà trop d'images (5 maximum)."));
				});
			}
			else
				res.redirect('/myaccount?type=error&msg='+ utf8.encode("Veuillez entrer une image au format JPG ou PNG."));
		}
		else
			res.redirect('/myaccount?type=error&msg='+ utf8.encode("Veuillez entrer une image valide."));
	});
});

// Myaccount, page de compte
app.get('/myaccount', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	passedVariable = req.query ? req.query : null;
	if (sess && sess.mail)
		res.render('myaccount', { imgs: sess.imgs ? sess.imgs : [], mail: sess.mail, type: passedVariable.type ? passedVariable.type : "", msg: passedVariable.msg ? passedVariable.msg : "", age: sess.age ? sess.age : 0, firstname: sess.firstname ? sess.firstname : "", name: sess.name ? sess.name : "" , sexe: sess.sexe ? sess.sexe : "", orientation: sess.orientation ? sess.orientation : "", description: sess.description ? sess.description : "" });
	else
		res.redirect('/?type=error&msg=' + utf8.encode("Vous devez être connecté."));
});

// Récuperation des informations POST de la page Myaccount
app.post('/myaccount', function(req, res) {
	var mail = sess.mail;
	sess.mail = req.body.mail ? protectQuery(req.body.mail) : "";
	sess.name = req.body.name ? protectQuery(req.body.name) : "";
	sess.firstname = req.body.firstname ? protectQuery(req.body.firstname) : "";
	sess.sexe = req.body.sexe == "F" ? "F" : "H";
	sess.age = (req.body.age > 0 && req.body.age < 101) ? req.body.age : 0;
	if (req.body.orientation == "F")
		sess.orientation = "F";
	else
		sess.orientation = req.body.orientation == "H" ? "H" : "";
	sess.description = req.body.description ? protectQuery(req.body.description) : "";
	connection.query('UPDATE users SET mail = ?, name = ?, firstname = ?, sexe = ?, orientation = ?, description = ?, age = ? WHERE mail = ?;', [sess.mail,  sess.name, sess.firstname, sess.sexe, sess.orientation, sess.description, sess.age, mail], function (error, results, fields) {
		if (error) 
			res.redirect('/?type=error&msg=' + utf8.encode(error.code));
		else
		{
			sess.tags = req.body.tags ? req.body.tags.split(",") : [];
			sess.tags.forEach(function(tag) {
				connection.query('INSERT INTO tags (uid, tag) VALUES ("' + sess.uid + '", "' + tag + '");', function(e, r, f) {
					if (error)
						console.log("Une erreur est survenue avec le code : " + error);
				});
			});
			sess.mail = queryBack(sess.mail);
			sess.name = queryBack(sess.name);
			sess.firstname = queryBack(sess.firstname);
			sess.sexe = sess.sexe;
			sess.orientation = sess.orientation;
			sess.description = queryBack(sess.description);
			res.redirect('/?type=ok&msg=' + utf8.encode("Votre compte a bien été modifié."));
		}
	});
});

// Search, page de recherche de matchs
app.get('/search', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	var userlist;
	sess.userselected = new Array();
	if (sess && sess.mail)
	{
		if (sess.firstname && sess.name && sess.sexe && sess.imgs[0] && sess.age && sess.age >= 18 && sess.lat != 0 && sess.lon != 0) {
			if (sess.orientation == ""){
				connection.query('SELECT * FROM users WHERE lon != 0 AND lat != 0 AND age >= 18 AND pic != 0;', function (error, results, fields) {
					sess.tags.forEach(function(tag) {
						if (error)
							console.log("Une erreur est survenue avec le code : " + error);
						else
						{
							userlist = results;
							userlist.forEach(function(user) {
								if (sess.uid != user.id) {
									connection.query('SELECT count(*) as count FROM tags WHERE uid = ? AND tag = ?', [user.id, tag], function (err, res, fie) {
										if (res[0].count > 0){
											user.distance = makeDistance(getDistance(sess.lat, sess.lon, user.lat, user.lon));
											sess.userselected.push(user);
										}
									});
								}
							});
						}
					});
				});
			}
			else
			{
				connection.query('SELECT * FROM users WHERE lon != 0 AND lat != 0 AND age >= 18 AND pic != 0 AND sexe = ?;', [sess.orientation], function (error, results, fields) {
					sess.tags.forEach(function(tag) {
						if (error)
							console.log("Error : " + error);
						else
						{
							userlist = results;
							userlist.forEach(function(user) {
								if (sess.uid != user.id) {
									connection.query('SELECT count(*) as count FROM tags WHERE uid = ? AND tag = ?', [user.id, tag], function (err, res, fie) {
										if (res[0].count > 0){
											user.distance = makeDistance(getDistance(sess.lat, sess.lon, user.lat, user.lon));
											sess.userselected.push(user);
										}
									});
								}
							});
						}
					});
				});
			}
			res.render('search', { mail : sess.mail, type: "" });
		}
		else
			res.redirect('/myaccount');
	}
	else
		res.redirect('/?type=error&msg=' + utf8.encode("Vous devez être connecté."));
});

// Login, page de connexion
app.get('/login', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	passedVariable = req.query ? req.query : null;
	if (sess && sess.mail)
		res.render('index', { mail: protectQuery(sess.mail), msg: "Vous êtes déjà connecté.", type: "error" });
	else
		res.render('login', { mail: "", type: passedVariable.type ? passedVariable.type : "", msg: passedVariable.msg ? passedVariable.msg : "" });
});

// Récuperation des informations POST de la page Login
app.post('/login', function(req, res) {
	sess = sess ? sess : req.session;
    res.charset = 'utf-8';
	if (sess && sess.mail)
		res.redirect('/?type=error&msg=' + utf8.encode("Vous êtes déjà connecté."));
	else {
		connection.query('SELECT * FROM users WHERE mail = "' + protectQuery(req.body.mail) + '" AND passwd = "' + hasha(protectQuery(req.body.passwd), {algorithm: 'whirlpool'}) + '";', function (error, results, fields) {
			if (results[0]) {
				sess.mail			= results[0].mail ? queryBack(results[0].mail) : "";
				sess.firstname		= results[0].firstname ? queryBack(results[0].firstname) : "";
				sess.name			= results[0].name ? queryBack(results[0].name) : "";
				sess.sexe			= results[0].sexe;
				sess.orientation	= results[0].orientation;
				sess.description	= results[0].description ? queryBack(results[0].description) : "";
				sess.uid			= results[0].id;
				sess.age			= results[0].age;
				sess.score			= results[0].score;
				sess.lat			= results[0].lat;
				sess.lon			= results[0].lon;
				connection.query('SELECT path FROM imgs WHERE uid = ?;', [sess.uid], function (e, r, f) {
					sess.imgs		= r;
				});
				connection.query('SELECT tag FROM tags WHERE uid = ?;', [sess.uid], function (e, r, f) {
					sess.tags = r;
					var index = 0;
					r.forEach(function(tag) {
						sess.tags[index] = tag.tag;
						index++;
					});
				});
				res.redirect('/?type=ok&msg=' + utf8.encode("Vous êtes maintenant connecté."));
			}
			else if (error)
				res.redirect('/login?type=error&msg=' + utf8.encode(error.code));
			else
				res.redirect('/login?type=error&msg=' + utf8.encode("Veuillez entrer des identifiants valides."));
		});
	}
});

// Signin, page d'inscription
app.get('/signin', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	passedVariable = req.query ? req.query : null;
	if (sess && sess.mail)
		res.render('index', { mail: sess.mail, msg: "Vous êtes déjà connecté.", type: "error" });
	else
		res.render('signin', { mail: "", type: passedVariable.type ? passedVariable.type : "", msg: passedVariable.msg ? passedVariable.msg : "" });
});

// Récuperation des informations POST de la page Signin
app.post('/signin', function(req, res) {
	var		mail,
			passwd;
	sess = sess ? sess : req.session;
	res.charset = 'utf-8';
	connection.query('SELECT COUNT(*) AS count FROM users WHERE mail = "' + protectQuery(req.body.mail) + '";', function (error, results, fields) {
		if (results[0].count == 0)
		{
			if (checkParams(req.body) != true)
				res.redirect('/?type=error&msg=' + utf8.encode(checkParams(req.body)));
			else
			{
				mail = protectQuery(req.body.mail);
				passwd = hasha(protectQuery(req.body.passwd), {algorithm: 'whirlpool'});
				connection.query('INSERT INTO users (mail, passwd) VALUES ("' + mail + '", "' + passwd + '");', function (error, results, fields) {
					if (error)
						res.redirect('/?type=error&msg=' + utf8.encode(error.code));
					else
						res.redirect('/?type=ok&msg=' + utf8.encode("Votre compte a bien été crée."));
				});
			}
    	}
    	else
    		res.redirect('/signin?type=error&msg=' + utf8.encode("Un compte utilise déjà cette e-mail."));
    });
});

app.use(function(req, res, next){
	res.status(404).render('404', {mail: "", msg: "", type: "", url: req.url });
});

//Demarage de la connexion via Socket.io
io.sockets.on('connection', function (socket) {
	socket.userid = -1;
	// Quand un client se connecte, on lui envoie un message
	socket.emit('message', 'Vous êtes bien connecté !');
	// On signale aux autres clients qu'il y a un nouveau venu
	socket.broadcast.emit('message', 'Un autre client vient de se connecter ! ');

	// Dès qu'on nous donne des coordonnées, on le stockes dans la session et en BDD
	socket.on('datas:send', function(datas) {
		sess = sess ? sess : null;
		if (sess && sess.mail && !socket.done) {
			socket.done == true;
			connection.query('UPDATE users SET lon = ?, lat = ? WHERE mail = ?;', [datas.lng, datas.lat, sess.mail] , function (error, results, fields) {
				if (error)
					console.log("Une erreur est survenue avec le code : " + error.code);
				else
				{
					sess.lon = socket.lon;
					sess.lat = socket.lat;
				}
			});
		}
	});

	socket.on('needMatches', function() {
		socket.emit('matches', sess.matchs);
	});

	socket.on('iLike', function() {
		var liked,
			disliked,
			score,
			uid;

		sess = sess ? sess : null;
		uid = socket.userid;
		if (sess.userselected[uid]) {
			connection.query('SELECT * FROM users WHERE id = ?', [uid], function(error, results, fields) {
				if (results[0]) {
					liked = results[0].liked + 1;
					disliked = results[0].disliked;
					score = (liked / (liked + disliked)) * 10; 
					connection.query('UPDATE users SET liked = ?, score = ? WHERE id = ?;', [liked, score, uid] , function (error, results, fields) {
						if (error)
							console.log("Une erreur est survenue avec le code :  : " + error);
					});
				}
			});
			connection.query('INSERT INTO matchs (uidlike, uidliked) VALUES ("' + sess.uid + '", "' + sess.userselected[uid].id + '");', function(error, results, fields) {
				if (error)
					console.error("Une erreur est survenue avec le code :  : " + error);
			});
		}
	});

	socket.on('iDontLike', function() {
		var liked,
			disliked,
			score,
			uid;

		uid = socket.userid;
		connection.query('SELECT * FROM users WHERE id = ?', [uid], function(error, results, fields) {
			if (results[0]) {
				liked = results[0].liked;
				disliked = results[0].disliked + 1;
				score = (liked / (liked + disliked)) * 10; 
				connection.query('UPDATE users SET disliked = ?, score = ? WHERE id = ?;', [disliked, score, uid] , function (error, results, fields) {
					if (error)
						console.log("Une erreur est survenue avec le code :  : " + error);
				});
			}
		});
	});

	socket.on('need', function() {
		sess = sess ? sess : null;
		socket.userid++;
		if (sess.userselected[socket.userid]) {
			connection.query('SELECT path FROM imgs WHERE uid = ?;', [sess.userselected[socket.userid].id], function (e, r, f) {
				if (r[0]) {
					sess.userselected[socket.userid].img = r[0].path;
					socket.emit('user', sess.userselected[socket.userid]);
				}
			});
		}
		else
			socket.emit('noMoreUser');
	});

	socket.on('didIMatch', function() {
		var count = 0;
		sess = sess ? sess : null;
		if (sess && sess.mail)
		{
			connection.query('SELECT * FROM matchs WHERE uidlike = ?;', [sess.uid], function (e, r, f) {
				if (r[0]) {
					r.forEach(function(elem) {
						connection.query('SELECT * FROM matchs WHERE uidlike = ? AND uidliked = ?;', [elem.uidliked, sess.uid], function (err, res, fie) {
							if (res[0])
								socket.emit('matchs', ++count);
						});
					});
				}
			});
		}
	});

	socket.on('didIVisit', function() {
		sess = sess ? sess : null;
		if (sess && sess.mail)
		{
			connection.query('SELECT visited FROM users WHERE id = ?;', [sess.uid], function (e, r, f) {
				if (r[0]) {
					socket.emit('visited', r[0].visited);
				}
			});
		}
	});

	socket.on('newMsg', function(param) {
		connection.query("INSERT INTO messages (senderid, receiverid, message) VALUES ('" + sess.uid + "', " + connection.escape(param.receiver) + ", " + connection.escape(param.msg) + ");", function (err, res, fie) {
			if (err)
				console.log("Une erreur est survenue avec le code :  : " + err);
		});
	})

	socket.on('needChat', function(uid) {
		sess = sess ? sess : null;
		var chat = new Array();
		if (sess && sess.mail)
		{
			console.log("Je cherche Moi : " + sess.uid + " Lui : " + uid);
			connection.query('SELECT * FROM messages WHERE senderid = ? AND receiverid = ?;', [sess.uid, uid], function (e, r, f) {
				if (r[0]) {
					chat = r;
				}
				connection.query('SELECT * FROM messages WHERE senderid = ? AND receiverid = ?;', [uid, sess.uid], function (err, res, fie) {
					if (res[0])
						socket.emit('chat', chat.concat(res));
					else
						socket.emit('chat', chat);
				});
			});
		}
	});
});

function protectQuery(str) {
	var lt = /</g, 
	gt = />/g, 
	ap = /'/g, 
	zt = /`/g,
	ic = /"/g;
	return (str.toString().replace(lt, "").replace(gt, "").replace(ap, ";ss;").replace(zt, "").replace(ic, ""));
}

function queryBack(str) {
	return (str.toString().replace(/;ss;/g, "'"));
}

function validateEmail(email) {
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}

function checkParams(params)
{
	if (params.passwd.length < 8)
		return ("Votre mot de passe est trop court, 8 caractères minimum.");
	else if (params.passwd != params.spasswd)
		return ("Vos mots de passes doivent correspondre.");
	else if (!validateEmail(params.mail))
		return ("Veuillez entrer un e-mail valide");
	else
		return (true);
}

function makeDistance(dist)
{
	dist = Math.round(dist * 1000) / 1000;
	if (dist < 1)
		dist *= 1000;
	return (dist);
}

function getDistance(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}