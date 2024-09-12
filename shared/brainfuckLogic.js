class BrainfuckLogic {
  constructor(conversions, maxReads = 2 ** 10) {
    this.maxReads = maxReads;
    this.conversions = conversions;
    if (!conversions) {
      this.conversions = {};
      for (let i = 0; i <= 10; i++) {
        this.conversions[i] = i;
      }
    }
    this.inverseConversions = Object.fromEntries(
      Object.entries(this.conversions).map(([k, v]) => [v, k])
    );
    this.bfMapping = {
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
      10: "]",
    };
    this.hrToBfMapping = Object.fromEntries(
      Object.entries(this.bfMapping).map(([k, v]) => [v, k])
    );
    this.colorMapping = {
      0: "#F0F2F3", // white
      1: "#E64C3C", // red
      2: "#F29B11", // orange
      3: "#FFEA00", // yellow
      4: "#7A3E00", // brown
      5: "#145A32", // green
      6: "#90EE90", // light green
      7: "#1A5276", // blue
      8: "#A3E4D7", // cyan
      9: "#8E44AD", // purple
      10: "#FF69B4", // pink
    };
  }

  executeSelfModifyingBrainfuck(tape) {
    let head0 = 0;
    let head1 = 0;
    let loopStack = [];
    let pointer = 0;
    let numReads = 0;
    while (pointer < tape.length && numReads < this.maxReads) {
      numReads += 1;
      let instruction = tape[pointer];
      instruction = this.conversions[instruction];
      switch (instruction) {
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
              numReads < this.maxReads
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

  execute1Read(state) {
    let { tape, pointer, head0, head1, loopStack, numReads } = state;
    tape = [...tape];
    loopStack = [...loopStack];
    if (pointer >= tape.length) {
      return state;
    }
    numReads += 1;
    let instruction = tape[pointer];
    instruction = this.conversions[instruction];
    switch (instruction) {
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
            numReads < this.maxReads
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
    return { tape, pointer, head0, head1, loopStack, numReads };
  }

  static randomData(size = 64, rng = Math, minInt = -256, maxInt = 0) {
    return BrainfuckLogic.randomProgram(size, rng, minInt, maxInt);
  }

  static randomProgram(size = 64, rng = Math, minInt = 0, maxInt = 10) {
    return Array.from(
      { length: size },
      () => Math.floor(rng.random() * (maxInt - minInt + 1)) + minInt
    );
  }

  toHumanReadableStr(intArr) {
    const _this = this;
    function intToHrChar(instruction) {
      if (instruction in _this.conversions) {
        instruction = _this.conversions[instruction];
        return _this.bfMapping[instruction];
      } else if (-10 <= instruction && instruction < 0) {
        return String(instruction * -1);
      } else if (10 < instruction && instruction <= 26 + 10) {
        return String.fromCharCode(instruction + 65 - 11);
      } else if (-26 - 10 <= instruction && instruction < -10) {
        return String.fromCharCode(instruction * -1 + 97 - 11);
      } else if (instruction > 26 + 10) {
        return "%";
      } else if (instruction < -26 - 10) {
        return "&";
      } else {
        return "?";
      }
    }

    return intArr.map((num) => intToHrChar(num)).join("");
  }

  fromHumanReadableStr(str) {
    const _this = this;
    function hrCharToInt(char) {
      if (char in _this.hrToBfMapping) {
        let instruction = _this.hrToBfMapping[char];
        return _this.inverseConversions[instruction];
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
    const charArr = str.split("").filter((c) => allowedChars.includes(c));
    return charArr.map((c) => hrCharToInt(c));
  }

  intToColor(instruction) {
    if (instruction in this.conversions) {
      instruction = this.conversions[instruction];
      return this.colorMapping[instruction];
    }
    if (instruction < 0) {
      const x = Math.max(0, 256 + instruction);
      return `rgb(${x},${x},${x})`;
    } else {
      const x = Math.max(0, 256 - instruction);
      const r = Math.max(0, x - 16);
      return `rgb(${r},${x},${x})`;
    }
  }

  crossProgramsWithRotation(a, b, rng) {
    const aLen = a.length;
    const combined = a.concat(b);
    const p = Math.floor(rng.random() * combined.length);
    const rotated = [...combined.slice(p), ...combined.slice(0, p)]
    const out = this.executeSelfModifyingBrainfuck(rotated);
    const p2 = combined.length - p;
    const unRotated = [...out.slice(p2), ...out.slice(0, p2)]
    a = unRotated.slice(0, aLen);
    b = unRotated.slice(aLen);
    return [a, b];
  }

  crossReactPrograms(a, b) {
    const aLen = a.length;
    const combined = a.concat(b);
    const out = this.executeSelfModifyingBrainfuck(combined);
    a = out.slice(0, aLen);
    b = out.slice(aLen);
    return [a, b];
  }

  matches(other) {
    const conversions1 = this.conversions;
    const conversions2 = other.conversions;
    const keys1 = Object.keys(conversions1);
    const keys2 = Object.keys(conversions2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (let key of keys1) {
      if (conversions1[key] !== conversions2[key]) {
        return false;
      }
    }
    return true;
  }

  fromGenericInput(text) {
    const isIntegerFormat = /^[,\-\d]+$/.test(text);
    if (isIntegerFormat) {
      const intArr = text.split(",").map((num) => parseInt(num));
      const validValues = intArr.every(
        (i) => !isNaN(i) && i !== null && i !== undefined
      );
      if (validValues) {
        return intArr;
      }
    }
    const textNoWhitespace = text.replace(/\s+/g, "");
    const isHrBfFormat = /^[a-zA-Z0-9{}\-\+\<\>\.,\[\]%&]+$/.test(
      textNoWhitespace
    );
    if (isHrBfFormat) {
      return this.fromHumanReadableStr(text);
    }
    throw new Error(`${text} contains invalid characters`);
  }
}

export { BrainfuckLogic };
