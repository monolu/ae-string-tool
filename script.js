// constants
const EXTENDED_IDS = ["extended", "shop_info", "smell", "smoke", "header_text", "desc_cloak"];
const SPECIAL_REGEX = /{([A-z0-9])|<([A-z0-9]{3})>/g;

// helper to check for extended types
const isExtendedType = id => EXTENDED_IDS.includes(id);

// Toggle reference box visibility using dataset
const toggleColor = () => {
  const refDiv = document.getElementById("reference_box");
  refDiv.style.display = refDiv.style.display !== "none" ? "none" : "block";
};

// Cache DOM elements
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

// Attach extra properties
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

// Update character count
const charCount = target => {
  let labelValue = target.label.getAttribute("data-default") || "";
  const strippedValue = target.value.replace(SPECIAL_REGEX, "");
  if (strippedValue.length > 0) {
    labelValue += ` (${strippedValue.length} chars)`;
  }
  target.label.innerHTML = labelValue;
};

// Convert colours (leaves spaces intact)
const convertColours = (input, output) => {
  let innerHTML = "<span id='x'>";
  let inputValue = input.value
    .replace("{[", "[")
    .replace("{]", "]")
    .replace("{]", "]")
    .replace(/<([A-z0-9]{2})>/g, "")
    .replace(/<>/g, "");
  
  const matches = inputValue.match(SPECIAL_REGEX) || [];
  for (const match of matches) {
    let stripped = match.replace(/[<{>]/g, "");
    let idValue = stripped;
    if (/^[0-9]+$/.test(idValue)) idValue = "n_" + idValue;
    if (idValue === idValue.toUpperCase()) idValue = "u_" + idValue;
    inputValue = inputValue.replace(match, `</span><span reservedwordforspaces id='${idValue}'>`);
  }
  
  inputValue = inputValue
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
  
  innerHTML += inputValue + "</span>";
  output.innerHTML = innerHTML;
};

// Remove all special characters
const removeSpecialChars = str => str.replace(/(\{.{1})|<([A-z0-9]{3})>/g, "").trim();

// Autofill the long description if not customised
const autofillLong = () => {
  if (el.long.getAttribute("data-customised") !== "true") {
    if (el.short.value) {
      const shortName = removeSpecialChars(el.short.value);
      const capitalisedShort = shortName.charAt(0).toUpperCase() + shortName.slice(1);
      el.long.value = `${capitalisedShort} is here.`;
    } else {
      el.long.value = "";
    }
    charCount(el.long);
    convertColours(el.long, el.long.convert);
  }
};

// Autofill keyword placeholder
const autofillKeyword = () => {
  const keywords = el.keywords.value.match(/\w+/g);
  el.target.placeholder = keywords ? keywords[0] : "";
};

// Calculate output (push each line so join adds the separator)
const calculateOutput = () => {
  const tool = el.toolType.value;
  const keyword = el.target.value || el.target.placeholder;
  const lines = [];
  const lineSeparator = el.separator.value || "\n";
  const allPrefix = el.groupTool.value === "on" ? "all." : "";
  let clipboardUsed = false;

  for (let definedString of el.userDefinedStrings) {
    if (definedString.value !== "") {
      let code = definedString.getAttribute("data-code");
      if (code.includes("extended")) {
        let codeTarget = code.replace("extended-", "");
        if (codeTarget === "keywords") codeTarget = el.keywords.value;
        code = `ed add ${codeTarget}`;
  
        if (allPrefix) {
          lines.push("clipboard clear", "clipboard edit", definedString.value);
          if (isExtendedType(definedString.id)) lines.push("@f");
          lines.push("@x", `${tool} ${allPrefix}${keyword} ${code}`);
          clipboardUsed = true;
        } else {
          lines.push(`${tool} ${allPrefix}${keyword} ${code}`, definedString.value);
          if (isExtendedType(definedString.id)) lines.push("@f");
          lines.push("@x");
        }
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
};

// Attach option toggles using dataset properties
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

// Global event listeners using e.target
el.container.addEventListener("click", e => {
  if (e.target.id !== "output") calculateOutput();
});

el.container.addEventListener("keyup", e => {
  if (["TEXTAREA", "INPUT"].includes(e.target.tagName) && e.target.id !== "output") {
    const label = document.getElementById(`${e.target.id}-label`);
    if (label && label.getAttribute("data-default")) {
      charCount(e.target);
    }
    const preview = document.getElementById(`${e.target.id}-convert`);
    if (preview) convertColours(e.target, preview);
    calculateOutput();
  }
});

el.keywords.addEventListener("keyup", autofillKeyword);
