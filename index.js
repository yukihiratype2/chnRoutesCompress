const fs = require('fs');

const cidrTools = require('cidr-tools');

const getIPV4 = /(CN\|ipv4\|)(\d{1,3}\.){3}\d{1,3}\|\d+\|/g;
const getRange = /\|\d+(?!\.)/;

const serparateIP = /(\d{1,3}\.){3}\d{1,3}/;

var specialReturnRules = [
  '47.74.0.219',
  '45.32.29.64'
]

var SperialPort = [
  33773,
  2146
]

var ShadowsocksPort = 1080;

var data = fs.readFileSync('./delegated-apnic-latest');
data = data.toString();
matches = data.match(getIPV4);

var tables = [];

if (fs.existsSync('router.sh')) {
  fs.unlinkSync('router.sh')
}

fs.appendFileSync('router.sh', `iptables -t nat -X SHADOWSOCKS\n
iptables -t nat -N SHADOWSOCKS\n
iptables -t nat -A SHADOWSOCKS -d 0.0.0.0\/8 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 10.0.0.0\/8 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 127.0.0.0\/8 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 169.254.0.0\/16 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 172.16.0.0\/12 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 192.168.0.0\/16 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 224.0.0.0\/4 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 240.0.0.0\/4 -j RETURN\n
`);

for (var i = 0, len = specialReturnRules.length; i < len; i++) {
  fs.appendFileSync('router.sh', 'iptables -t nat -A SHADOWSOCKS -d ' + specialReturnRules[i] + ' -j RETURN\n');
}

for (var i = 0, len = SperialPort.length; i < len; i++) {
  fs.appendFileSync('router.sh', 'iptables -t nat -A SHADOWSOCKS -p tcp --dport ' + SperialPort[i] + ' -j RETURN\n');
}
fs.appendFileSync('router.sh', '\n');

for (var i = 0, len = matches.length; i < len; i++) {
  let preMatched = matches[i].substr(8);
  let IPaddress = preMatched.match(serparateIP)[0];
  let PreIPRange = preMatched.match(getRange)[0].substr(1);
  let IPRange = 32 - Math.log2(PreIPRange);
  tables.push(IPaddress + '\/' + IPRange);
}

console.log(tables.length);

cidrTools.merge(tables).then(r => {
  console.log(r.length);
  for (var i = 0, len = r.length; i < len; i++) {
    fs.appendFileSync('router.sh', 'iptables -t nat -A SHADOWSOCKS -d ' + r[i] + ' -j RETURN\n');
  }
  fs.appendFileSync('router.sh', '\niptables -t nat -A SHADOWSOCKS -p tcp -j REDIRECT --to-ports ' + ShadowsocksPort + '\n\n');
  fs.appendFileSync('router.sh', 'iptables -t nat -A PREROUTING -p tcp -j SHADOWSOCKS')
});
