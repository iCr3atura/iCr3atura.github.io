async function setup() {
    const patchExportURL = "export/patch.export.json";

    // Create AudioContext
    const WAContext = window.AudioContext || window.webkitAudioContext;
    const context = new WAContext();

    // Create gain node and connect it to audio output
    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    // Fetch the exported patcher
    let response, patcher;
    try {
        response = await fetch(patchExportURL);
        patcher = await response.json();

        if (!window.RNBO) {
            // Load RNBO script dynamically
            // Note that you can skip this by knowing the RNBO version of your patch
            // beforehand and just include it using a <script> tag
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }

    } catch (err) {
        const errorContext = {
            error: err
        };
        if (response && (response.status >= 300 || response.status < 200)) {
            errorContext.header = `Couldn't load patcher export bundle`,
                errorContext.description = `Check app.js to see what file it's trying to load. Currently it's` +
                ` trying to load "${patchExportURL}". If that doesn't` +
                ` match the name of the file you exported from RNBO, modify` +
                ` patchExportURL in app.js.`;
        }
        if (typeof guardrails === "function") {
            guardrails(errorContext);
        } else {
            throw err;
        }
        return;
    }

    // (Optional) Fetch the dependencies
    let dependencies = [];
    try {
        const dependenciesResponse = await fetch("export/dependencies.json");
        dependencies = await dependenciesResponse.json();

        // Prepend "export" to any file dependenciies
        dependencies = dependencies.map(d => d.file ? Object.assign({}, d, { file: "export/" + d.file }) : d);
    } catch (e) { }

    // Create the device
    let device;
    try {
        device = await RNBO.createDevice({ context, patcher });
    } catch (err) {
        if (typeof guardrails === "function") {
            guardrails({ error: err });
        } else {
            throw err;
        }
        return;
    }

    // (Optional) Load the samples
    if (dependencies.length)
        await device.loadDataBufferDependencies(dependencies);

    // Connect the device to the web audio graph
    device.node.connect(outputNode);

    document.body.onclick = () => {
        context.resume();
    }

    // Skip if you're not using guardrails.js
    if (typeof guardrails === "function")
        guardrails();

    return device;
}

function loadRNBOScript(version) {
    return new Promise((resolve, reject) => {
        if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
            throw new Error("Patcher exported with a Debug Version!\nPlease specify the correct RNBO version to use in the code.");
        }
        const el = document.createElement("script");
        el.src = "https://c74-public.nyc3.digitaloceanspaces.com/rnbo/" + encodeURIComponent(version) + "/rnbo.min.js";
        el.onload = resolve;
        el.onerror = function (err) {
            console.log(err);
            reject(new Error("Failed to load rnbo.js v" + version));
        };
        document.body.append(el);
    });
}

function makeInportForm(device) {
    const idiv = document.getElementById("rnbo-inports");
    const inportSelect = document.getElementById("inport-select");
    const inportText = document.getElementById("inport-text");
    const inportForm = document.getElementById("inport-form");
    let inportTag = null;

    // Device messages correspond to inlets/outlets or inports/outports
    // You can filter for one or the other using the "type" of the message
    const messages = device.messages;
    const inports = messages.filter(message => message.type === RNBO.MessagePortType.Inport);

    if (inports.length === 0) {
        idiv.removeChild(document.getElementById("inport-form"));
        return;
    } else {
        idiv.removeChild(document.getElementById("no-inports-label"));
        inports.forEach(inport => {
            const option = document.createElement("option");
            option.innerText = inport.tag;
            inportSelect.appendChild(option);
        });
        inportSelect.onchange = () => inportTag = inportSelect.value;
        inportTag = inportSelect.value;

        inportForm.onsubmit = (ev) => {
            // Do this or else the page will reload
            ev.preventDefault();

            // Turn the text into a list of numbers (RNBO messages must be numbers, not text)
            const values = inportText.value.split(/\s+/).map(s => parseFloat(s));

            // Send the message event to the RNBO device
            let messageEvent = new RNBO.MessageEvent(RNBO.TimeNow, inportTag, values);
            device.scheduleEvent(messageEvent);
        }
    }
}

function attachOutports(device) {
    const outports = device.outports;
    if (outports.length < 1) {
        document.getElementById("rnbo-console").removeChild(document.getElementById("rnbo-console-div"));
        return;
    }

    document.getElementById("rnbo-console").removeChild(document.getElementById("no-outports-label"));
    device.messageEvent.subscribe((ev) => {

        // Ignore message events that don't belong to an outport
        if (outports.findIndex(elt => elt.tag === ev.tag) < 0) return;

        // Message events have a tag as well as a payload
        console.log(`${ev.tag}: ${ev.payload}`);

        document.getElementById("rnbo-console-readout").innerText = `${ev.tag}: ${ev.payload}`;
    });
}
async function loadSheet(device) {
    const spreadsheetId = '1Tm9vhRCIFSM28BVAtu8VlBzAjOeiKm0JEBJv9LuNCiQ';
    const apiKey = 'AIzaSyBfyFdsfsU5kOj5eUXjkpWRrUhFxkWiFWo';
    const range = 'Sheet1!A:M';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const latest = data.values[data.values.length - 1];
    // document.getElementById('displayText').innerText = latestText;
    // console.log('Latest text:', latestText);

    // const letterCount = latestText.replace(/[^a-zA-Z]/g, '').length;
    // console.log('Letter count:', letterCount);
    let age = latest[0];
    try {
        age = parseInt(age)
    } catch (error) {
        age = 0
    }
    let sex = latest[1];
    if (sex == 'женский') { sex = 0 } else if (sex == 'мужской') { sex = 1 } else { sex = 2 }
    const conditions = latest[2];
    const habits = latest[3];
    const child_illnesses = latest[4];
    const chronical_illnesses = latest[5];
    const invasions = latest[6];
    const traumas = latest[7];
    const allergy = latest[8];
    const genetics = latest[9];
    const stds = latest[10];
    const main = latest[11];
    const main_prog = latest[12];

    const totalLength = latest.map(str => str.length).reduce((sum, len) => sum + len, 0);
    const wordCount = latest.map(str => str.split(/\s+/).length).reduce((sum, len) => sum + len, 0);
    function findMostUsedUnicodeSymbol(inputString) {
        const charCount = {};
        const chars = [...inputString];
        for (const char of chars) {
            charCount[char] = (charCount[char] || 0) + 1;
        }
        let mostUsedSymbol = null;
        let maxCount = 0;

        for (const [char, count] of Object.entries(charCount)) {
            if (count > maxCount) {
                mostUsedSymbol = char;
                maxCount = count;
            }
        }

        return {
            symbol: mostUsedSymbol.codePointAt(0),
            count: maxCount,
        };
    }
    const { symbol, count } = findMostUsedUnicodeSymbol(latest.join(''))
    const variables = {age, sex, totalLenght: totalLength, totalWords: wordCount, symbol, count};
    console.log(variables)
    for (const [key, value] of Object.entries(variables)) {
      // debugger
        device.parametersById.get(key).value = value;
    }
}
