function executeSelfModifyingBrainfuck(tape, maxReads = 2 ** 13) {
  let head0 = 0;
  let head1 = 0;
  let loopStack = [];
  let pointer = 0;
  let numReads = 0;
  while (pointer < tape.length && numReads < maxReads) {
    numReads += 1;
    let char = tape[pointer];
    switch (char) {
      case 1:
        head0 = (head0 - 1 + tape.length) % tape.length;
        break;
      case 2:
        head0 = (head0 + 1) % tape.length;
        break;
      case 3:
        head1 = (head1 - 1 + tape.length) % tape.length;
        break;
      case 4:
        head1 = (head1 + 1) % tape.length;
        break;
      case 5:
        tape[head0] -= 1;
        break;
      case 6:
        tape[head0] += 1;
        break;
      case 7:
        tape[head1] = tape[head0];
        break;
      case 8:
        tape[head0] = tape[head1];
        break;
      case 9:
        if (tape[head0] === 0) {
          let loopLevel = 1;
          while (
            loopLevel > 0 &&
            pointer < tape.length - 1 &&
            numReads < maxReads
          ) {
            numReads += 1;
            pointer += 1;
            if (tape[pointer] === 9) {
              loopLevel += 1;
            } else if (tape[pointer] === 10) {
              loopLevel -= 1;
            }
          }
        } else {
          loopStack.push(pointer);
        }
        break;
      case 10:
        if (tape[head0] !== 0) {
          if (loopStack.length === 0) {
            pointer = 0;
            continue;
          } else {
            pointer = loopStack[loopStack.length - 1];
          }
        } else {
          if (loopStack.length > 0) {
            loopStack.pop();
          }
        }
        break;
    }
    pointer += 1;
  }
  return tape;
}

function execute1Read(state) {
  let { tape, pointer, head0, head1, loopStack, numReads, maxReads } = state;
  tape = [...tape];
  loopStack = [...loopStack];
  if (pointer >= tape.length) {
    return state;
  }
  numReads += 1;
  let char = tape[pointer];
  switch (char) {
    case 1:
      head0 = (head0 - 1 + tape.length) % tape.length;
      break;
    case 2:
      head0 = (head0 + 1) % tape.length;
      break;
    case 3:
      head1 = (head1 - 1 + tape.length) % tape.length;
      break;
    case 4:
      head1 = (head1 + 1) % tape.length;
      break;
    case 5:
      tape[head0] -= 1;
      break;
    case 6:
      tape[head0] += 1;
      break;
    case 7:
      tape[head1] = tape[head0];
      break;
    case 8:
      tape[head0] = tape[head1];
      break;
    case 9:
      if (tape[head0] === 0) {
        let loopLevel = 1;
        while (
          loopLevel > 0 &&
          pointer < tape.length - 1 &&
          numReads < maxReads
        ) {
          numReads += 1;
          pointer += 1;
          if (tape[pointer] === 9) {
            loopLevel += 1;
          } else if (tape[pointer] === 10) {
            loopLevel -= 1;
          }
        }
      } else {
        loopStack.push(pointer);
      }
      break;
    case 10:
      if (tape[head0] !== 0) {
        if (loopStack.length === 0) {
          pointer = -1;
        } else {
          pointer = loopStack[loopStack.length - 1];
        }
      } else {
        if (loopStack.length > 0) {
          loopStack.pop();
        }
      }
      break;
  }
  pointer++;
  return { tape, pointer, head0, head1, loopStack, numReads, maxReads };
}

// generates random values that can include both data and executable bf commands
function randomProgram(size = 64, minInt = 0, maxInt = 10) {
  return Array.from(
    { length: size },
    () => Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt
  );
}

// generates random values that can ONLY be data (it will not include executable bf commands)
function randomData(size = 64, minInt = 11, maxInt = 255) {
  return randomProgram(size, minInt, maxInt);
}

function toHumanReadableStr(intArr) {
  function intToHrChar(_int) {
    const bfMapping = {
      0: "0",
      1: "<",
      2: ">",
      3: "{",
      4: "}",
      5: "-",
      6: "+",
      7: ".",
      8: ",",
      9: "[",
      10: "]"
    };
    if (_int in bfMapping) {
      return bfMapping[_int];
    } else if (-10 <= _int && _int < 0) {
      return String(_int * -1);
    } else if (10 < _int && _int <= 26 + 10) {
      return String.fromCharCode(_int + 65 - 11);
    } else if (-26 - 10 <= _int && _int < -10) {
      return String.fromCharCode(_int * -1 + 97 - 11);
    } else if (_int > 26 + 10) {
      return "%";
    } else if (_int < -26 - 10) {
      return "&";
    }
  }

  return intArr.map(num => intToHrChar(num)).join("");
}

function fromHumanReadableStr(str) {
  const hrToBfMapping = {
    0: 0,
    "<": 1,
    ">": 2,
    "{": 3,
    "}": 4,
    "-": 5,
    "+": 6,
    ".": 7,
    ",": 8,
    "[": 9,
    "]": 10
  };
  function hrCharToInt(char) {
    if (char in hrToBfMapping) {
      return hrToBfMapping[char];
    } else if (char >= "0" && char <= "9") {
      return -parseInt(char, 10);
    } else if (char >= "A" && char <= "Z") {
      return char.charCodeAt(0) - 65 + 11;
    } else if (char >= "a" && char <= "z") {
      return -(char.charCodeAt(0) - 97 + 11);
    } else if (char === "%") {
      return 26 + 11 + 1;
    } else if (char === "&") {
      return -(26 + 11 + 1);
    }
  }
  const allowedChars =
    "%&0123456789<>{}-+.,[]abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const charArr = str.split("").filter(c => allowedChars.includes(c));
  return charArr.map(c => hrCharToInt(c));
}

function crossReactPrograms(a, b) {
  let out = executeSelfModifyingBrainfuck(a.concat(b));
  let halfLen = Math.floor(out.length / 2);
  a = out.slice(0, halfLen);
  b = out.slice(halfLen);
  return [a, b];
}

export {
  crossReactPrograms,
  randomProgram,
  randomData,
  toHumanReadableStr,
  fromHumanReadableStr,
  execute1Read
};
