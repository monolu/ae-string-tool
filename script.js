// HELPER FUNCTIONS

// debounce function to limit how often calculateOutput runs
const debounce = (func, delay = 200) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

// check if an id is one of the extended types
const EXTENDED_IDS = ["extended", "shop_info", "smell", "smoke", "header_text", "desc_cloak"];
const isExtendedType = id => EXTENDED_IDS.includes(id);

// this whole reference box thing is so scuffed but whatever
const toggleColour = () => {
  const refDiv = document.getElementById("reference_box");
  refDiv.style.display = refDiv.style.display !== "none" ? "none" : "block";
};

// DOM caching
const el = {
  container: document.getElementById("main-wrapper"),
  short: document.getElementById("short"),
  keywords: document.getElementById("keywords"),
  long: document.getElementById("long"),
  extended: document.getElementById("extended"),
  eat: document.getElementById("eat"),
  taste: document.getElementById("taste"),
  separator: document.getElementById("separator"),
  toolType: document.getElementById("tool-type"),
  target: document.getElementById("target"),
  groupTool: document.getElementById("group-tool"),
  output: document.getElementById("output"),
  userDefinedStrings: document.getElementsByClassName("user-defined-string"),
  options: document.querySelectorAll("#options-box input[type='checkbox']")
};

// attach extra properties for labels and preview elements
el.short.label = document.getElementById("short-label");
el.short.convert = document.getElementById("short-convert");
el.long.label = document.getElementById("long-label");
el.long.convert = document.getElementById("long-convert");
el.extended.label = document.getElementById("extended-label");
el.extended.convert = document.getElementById("extended-convert");
el.eat.label = document.getElementById("eat-label");
el.eat.convert = document.getElementById("eat-convert");
el.taste.label = document.getElementById("taste-label");
el.taste.convert = document.getElementById("taste-convert");

// char counter
const SPECIAL_REGEX = /{([A-z0-9])|<([A-z0-9]{3})>/g;
const charCount = target => {
  let base = target.label.getAttribute("data-default") || "";
  const stripped = target.value.replace(SPECIAL_REGEX, "");
  if (stripped.length > 0) base += ` (${stripped.length} chars)`;
  target.label.innerHTML = base;
};

// helper to compute the visible length (ignores colour codes)
// the fact that this regex works is proof that there is no god
const wrapExtendedText = (text, limit = 80) => {
  const getVisibleLength = str =>
    str.replace(/({[A-Za-z0-9])|(<[A-Za-z0-9]{3}>)/g, "").length;

  // split the text into parts (words and whitespace)
  const parts = text.split(/(\s+)/);
  let lines = [];
  let currentLine = "";
  let currentVisible = 0;

  parts.forEach(part => {
    // if the part is just whitespace, replace it with a single space
    if (/^\s+$/.test(part)) {
      part = " ";
    }
    const partVisible = getVisibleLength(part);
    if (currentVisible + partVisible <= limit) {
      // add the part to the current line
      currentLine += part;
      currentVisible += partVisible;
    } else {
      // if adding this part would exceed the limit,
      // finish the current line (trim any trailing space)
      if (currentLine.trim() !== "") {
        lines.push(currentLine.trimEnd());
      }
      // start a new line with the part (trim any leading space)
      currentLine = part.trimStart();
      currentVisible = getVisibleLength(currentLine);
    }
  });

  if (currentLine.trim() !== "") {
    lines.push(currentLine.trimEnd());
  }

  return lines.join("\n");
};


// convert colours
// now uses a callback in replace to convert each match
// i hate regex
const convertColours = (input, output) => {
  let text = input.value
    .replace("{[", "[")
    .replace("{]", "]")
    .replace("{]", "]")
    .replace(/<([A-z0-9]{2})>/g, "")
    .replace(/<>/g, "");
  
  text = text.replace(SPECIAL_REGEX, match => {
    const stripped = match.replace(/[<{>]/g, "");
    let idValue = stripped;
    if (/^[0-9]+$/.test(idValue)) idValue = "n_" + idValue;
    if (idValue === idValue.toUpperCase()) idValue = "u_" + idValue;
    return `</span><span reservedwordforspaces id='${idValue}'>`;
  });
  
  // i should add $T here as well but idk how that works i haven't tried it ingame yet
  text = text
    .replace(/\$n/g, "Iris")
    .replace(/\$e/g, "she")
    .replace(/\$s/g, "her")
    .replace(/\$m/g, "her")
    .replace(/\{\(/g, "&lt;")
    .replace(/\{\)/g, "&gt;")
    .replace(/\\{\{/g, "{")
    .replace(/\\{\}/g, "}")
    .replace(/(\n|\r|\{\/)/g, "<br/>")
    .replace(/reservedwordforspaces/g, " ");
  
  output.innerHTML = `<span id='x'>${text}</span>`;
};

// remove special chars
const removeSpecialChars = str => str.replace(/(\{.{1})|<([A-z0-9]{3})>/g, "").trim();

// auto-resize textareas
const autoResize = textarea => {
  textarea.style.height = "35px"; // magic number but this is what looks good and I hate css
  textarea.style.height = textarea.scrollHeight + "px";
};

// attach autoResize on user input
document.querySelectorAll("textarea").forEach(ta => {
  ta.addEventListener("input", () => autoResize(ta));
  autoResize(ta);
});

// autofill longdesc
const autofillLong = () => {
  if (el.long.getAttribute("data-customised") !== "true") {
    if (el.short.value) {
      const raw = el.short.value;
      const capitalised = raw.charAt(0).toUpperCase() + raw.slice(1);
      el.long.value = `${capitalised} is here.`;
    } else {
      el.long.value = "";
    }
    charCount(el.long);
    convertColours(el.long, el.long.convert);
    autoResize(el.long);
  }
};

// autofill keyword placeholder
const autofillKeyword = () => {
  const kws = el.keywords.value.match(/\w+/g);
  el.target.placeholder = kws ? kws[0] : "";
};

// process extended input and wrap extended text at 80 visible characters
const processExtended = definedString => {
  let code = definedString.getAttribute("data-code");
  let codeTarget = code.replace("extended-", "");
  if (codeTarget === "keywords") codeTarget = el.keywords.value;
  code = `ed add ${codeTarget}`;
  const tool = el.toolType.value;
  const keyword = el.target.value || el.target.placeholder;
  const allPrefix = el.groupTool.value === "on" ? "all." : "";
  
  // split the extended text into lines and trim leading whitespace on each line
  const textLines = definedString.value.split(/\r?\n/).map(line => line.replace(/^\s+/, ""));
  
  let lines = [];
  if (allPrefix) {
    lines.push("clipboard clear", "clipboard edit");
    lines.push(...textLines);
    lines.push("@x", `${tool} ${allPrefix}${keyword} ${code}`);
  } else {
    lines.push(`${tool} ${allPrefix}${keyword} ${code}`);
    lines.push(...textLines);
    lines.push("@x");
  }
  return lines;
};


// calc output then update the output textarea's height
const calculateOutput = () => {
  const tool = el.toolType.value;
  const keyword = el.target.value || el.target.placeholder;
  const allPrefix = el.groupTool.value === "on" ? "all." : "";
  const lineSeparator = el.separator.value || "\n";
  const lines = [];
  let clipboardUsed = false;
  
  for (let definedString of el.userDefinedStrings) {
    if (definedString.value.trim() !== "") {
      let code = definedString.getAttribute("data-code");
      if (code.includes("extended")) {
        const extendedLines = processExtended(definedString);
        lines.push(...extendedLines);
        if (allPrefix) clipboardUsed = true;
      } else {
        lines.push(`${tool} ${allPrefix}${keyword} ${code} ${definedString.value}`);
      }
    }
  }
  
  if (el.keywords.value.length) {
    lines.push(`${tool} ${allPrefix}${keyword} keyword ${el.keywords.value}`);
  }
  
  if (clipboardUsed) lines.push("clipboard clear");
  el.output.value = lines.join(lineSeparator);
  autoResize(el.output); // update output height
};

// EVENT LISTENERS

// debounced calculateOutput for performance
const debouncedCalcOutput = debounce(calculateOutput);

// listen to input
el.container.addEventListener("input", e => {
  if (["TEXTAREA", "INPUT"].includes(e.target.tagName) && e.target.id !== "output") {
    const label = document.getElementById(`${e.target.id}-label`);
    if (label && label.getAttribute("data-default")) charCount(e.target);
    const preview = document.getElementById(`${e.target.id}-convert`);
    if (preview) convertColours(e.target, preview);
    debouncedCalcOutput();
  }
});

// we need to listen to click events for the dropdown to work
el.container.addEventListener("click", e => {
  if (e.target.id !== "output") calculateOutput();
});

// autofill keyword
el.keywords.addEventListener("input", autofillKeyword);

// autofill longdesc
el.short.addEventListener("input", () => {
  autofillLong();
});

// listen for clicks to the funny colour toggle button
// i hate how i implemented this stupid colour reference thing but here we are
document
  .getElementById("colour-toggle-button")
  .addEventListener("click", toggleColour);

// attach option toggles using dataset properties
el.options.forEach(option => {
  option.addEventListener("click", () => {
    const target = document.getElementById(option.dataset.target);
    const label = document.getElementById(`${option.id}-label`);
    if (option.dataset.toggle === "true") {
      option.dataset.toggle = "false";
      target.dataset.toggle = "false";
      const input = target.querySelector("input");
      const textarea = target.querySelector("textarea");
      if (option.id === "check-cup" || option.id === "check-plate") {
        if (input) input.value = "";
      } else {
        if (textarea) textarea.value = "";
      }
      const preview = target.querySelector(".preview");
      if (preview) preview.innerHTML = "";
      label.className = "";
    } else {
      option.dataset.toggle = "true";
      target.dataset.toggle = "true";
      label.className = "extended-desc-shown";
    }
  });
});
