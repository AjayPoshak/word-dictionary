export function parseValueFromString(str, target) {
  const matchInfo = str.match(target);
  if (matchInfo === null) return null;
  const { index } = matchInfo;
  const splitString = str.split("");
  let itr = index + target.length;
  let value = "";
  while (itr < splitString.length) {
    if (splitString[itr] === ":") {
      itr++;
      continue;
    }
    if (splitString[itr] === "\n") break;
    value += splitString[itr];
    itr++;
  }
  return value;
}
