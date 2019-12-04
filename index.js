// @ts-nocheck
const express = require('express'),
		app = express(),
		 port = process.env.PORT || 8080;
const { Wit } = require('node-wit');
const { execFile } = require("child_process");
const fs = require("fs");

const DEFAULT_CONTEXT = {};
const NLP_DIR = process.env.INTERPRETERS || "./interpreters";
const WIT_CONFIG = require("./interpreters.json");

app.listen(port);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(`serving on port ${port}`);

const remote_interpreter = access_token => {
	let client = new Wit({
		accessToken: access_token
	});
	return (req, res) => {
		let message = req.body;
		console.log(`Interpreting: "${message.user_input}"`);
		client.message(
				message.user_input,
				Object.assign({}, DEFAULT_CONTEXT, message.context))
			.then(data =>
				console.log('Entities Found:', data.entities) ||
					res.json(data.entities))
			.catch(err => res.send(err));
	};
};

const local_interpreter = path => (req, res) => {
	console.log('Executing:', path);
	console.log('Interpreting:', req.body.user_input);
	execFile(
		path,
		[JSON.stringify(req.body)],
		(error, stdout, stderr) => {
			if (error)
				res.send(stderr);
			else
				console.log('Entities found:', stdout) ||
					res.json(JSON.parse(stdout));
		}
	);
};

Object.entries(WIT_CONFIG).forEach(([name, key]) => {
	console.log(`Routing "localhost:${port}/${name}" to Wit with key: "${key}"`);
	app.route(`/${name}`).post(remote_interpreter(key));
});

fs.readdirSync(NLP_DIR).forEach(name => {
	console.log(`Routing "localhost:${port}/${name}" to ${NLP_DIR}/${name}/`);
	app.route(`/${name}`).post(local_interpreter(`${NLP_DIR}/${name}/index`));
});
