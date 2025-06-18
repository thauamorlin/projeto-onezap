const net = require("net");
const os = require("os");
const port = 3337;

// Função para obter o endereço IP local
function getLocalIP() {
	const interfaces = os.networkInterfaces();
	let address = 'localhost';

	// Procurar por um endereço IPv4 não interno
	Object.keys(interfaces).forEach((ifname) => {
		interfaces[ifname].forEach((iface) => {
			// Pular endereços internos, de loopback e não IPv4
			if (iface.family === 'IPv4' && !iface.internal) {
				address = iface.address;
			}
		});
	});

	return address;
}

const ip = getLocalIP();
console.log(`Usando IP: ${ip}`);

process.env.ELECTRON_START_URL = `http://${ip}:${port}`;

const client = new net.Socket();

let startedElectron = false;
const tryConnection = () =>
	// @ts-ignore
	client.connect({ port: port, host: ip }, () => {
		client.end();
		if (!startedElectron) {
			startedElectron = true;
			const exec = require("child_process").exec;
			const electronProcess = exec("npm run electron");

			electronProcess.stdout.on("data", (data) => {
				console.log(data.toString());
			});

			electronProcess.stderr.on("data", (data) => {
				console.error(data.toString());
			});

			electronProcess.on("close", (code) => {
				console.log(`Electron process exited with code ${code}`);
			});
		}
	});

client.on("error", () => {
  setTimeout(tryConnection, 1000);
});
tryConnection();
