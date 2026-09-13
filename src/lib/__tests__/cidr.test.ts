import { inCidr } from "../cidr";

const cases: [string, string, boolean][] = [
  // plain IPv4
  ["103.21.58.14", "103.21.58.0/24", true],
  ["103.21.59.14", "103.21.58.0/24", false],
  ["103.21.58.0", "103.21.58.0/24", true],
  ["103.21.58.255", "103.21.58.0/24", true],
  // non-byte-aligned prefixes
  ["192.168.1.130", "192.168.1.128/25", true],
  ["192.168.1.127", "192.168.1.128/25", false],
  ["10.5.4.3", "10.0.0.0/8", true],
  ["11.5.4.3", "10.0.0.0/8", false],
  // /32 and bare address
  ["1.2.3.4", "1.2.3.4/32", true],
  ["1.2.3.5", "1.2.3.4/32", false],
  ["1.2.3.4", "1.2.3.4", true],
  // /0 matches everything of the same family
  ["8.8.8.8", "0.0.0.0/0", true],
  // IPv4-mapped IPv6 must match an IPv4 range
  ["::ffff:103.21.58.14", "103.21.58.0/24", true],
  ["::ffff:103.21.59.14", "103.21.58.0/24", false],
  // IPv6
  ["2001:db8::1", "2001:db8::/32", true],
  ["2001:db9::1", "2001:db8::/32", false],
  ["::1", "::1/128", true],
  ["fe80::abcd", "fe80::/10", true],
  ["2400:adc1:1a2:3b00::5", "2400:adc1::/32", true],
  // families never cross
  ["1.2.3.4", "2001:db8::/32", false],
  ["2001:db8::1", "1.2.3.0/24", false],
  // malformed input is refused, never accepted
  ["not-an-ip", "10.0.0.0/8", false],
  ["1.2.3.4", "garbage", false],
  ["999.1.1.1", "999.1.1.0/24", false],
  ["1.2.3.4", "1.2.3.0/33", false],
  ["1.2.3.4", "1.2.3.0/-1", false],
  ["", "10.0.0.0/8", false],
];

let pass = 0;
const failures: string[] = [];
for (const [ip, cidr, want] of cases) {
  const got = inCidr(ip, cidr);
  if (got === want) pass++;
  else failures.push(`  ${ip} in ${cidr} -> got ${got}, want ${want}`);
}

console.log(`${pass}/${cases.length} passed`);
if (failures.length) {
  console.log("FAILURES:");
  failures.forEach((f) => console.log(f));
  process.exit(1);
}
