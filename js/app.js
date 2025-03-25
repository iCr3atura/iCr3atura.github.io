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
    el.onerror = function(err) {
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

  const joined = latest.join('')
  const { symbol, count } = findMostUsedUnicodeSymbol(joined)
  const total_gr = count_substr('гр', joined)
  const total_rak = count_substr('рак', joined) + count_substr('опух', joined) + count_substr('злокачеств', joined)
  const total_traum = count_substr('травм', joined)
  const total_smert = count_substr('смерт', joined) + count_substr('летал', joined)
  const total_hron = count_substr('хрон', joined)
  const total_lom = count_substr('лом', joined)

  const smoke = habits.includes('кур', 0);
  const alco = habits.includes('алко', 0) || habits.includes('пил', 0);
  const drugs = habits.includes('нарк', 0) || habits.includes('микродоз', 0);
  let addiction = undefined

  if (!smoke && !alco && !drugs) {
    addiction = 0;
  } else if (smoke && !alco && !drugs) {
    addiction = 1;
  } else if (!smoke && alco && !drugs) {
    addiction = 2;
  } else if (!smoke && !alco && drugs) {
    addiction = 3;
  } else if (smoke && alco && !drugs) {
    addiction = 4;
  } else if (!smoke && alco && drugs) {
    addiction = 5;
  } else if (smoke && !alco && drugs) {
    addiction = 6;
  } else {
    addiction = 7;
  }

  const stds_count = stds.includes('нет', 0) ? 0 : 1;
  const vetryanka = child_illnesses.includes('ветр', 0) ? 1 : 0;

  const allergies = allergy.split(/\s+/).length;
  const progression = main_prog.split(/\s+/).length;

  const variables = {
    age, sex, totalLenght: totalLength, totalWords: wordCount, symbol, count, // total_gr, total_rak, total_traum,
    // total_smert, total_hron, total_lom, addiction, stds: stds_count, vetryanka, allergies, progression
  };

  console.log(variables)
  for (const [key, value] of Object.entries(variables)) {
    // debugger
    device.parametersById.get(key).value = value;
  }
}

function count_substr(substring, value) {
  let regex = new RegExp(substring, 'g');
  let matches = value.match(regex) || [];
  return matches.length;
}

// Function to encode AudioBuffer as WAV
function bufferToWave(abuffer) {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let offset = 0;

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, abuffer.sampleRate, true); offset += 4;
  view.setUint32(offset, abuffer.sampleRate * numOfChan * 2, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, abuffer.length * numOfChan * 2, true); offset += 4;

  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i));
  }
  for (let i = 0; i < abuffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i])) * 32767;
      view.setInt16(offset, sample | 0, true);
      offset += 2;
    }
  }

  return buffer;
}

function recordAndExportAudio(device) {
  if (!device || !device.node) {
    console.error('RNBO device or node not available for recording');
    return;
  }

  const context = device.context;
  const sampleRate = context.sampleRate;
  const duration = 60; // 1 minute
  const bufferSize = 4096; // Common buffer size for ScriptProcessorNode
  const numChannels = 2; // Stereo
  const totalSamples = sampleRate * duration;
  const audioData = {
    left: new Float32Array(totalSamples),
    right: new Float32Array(totalSamples),
    index: 0
  };

  // Create ScriptProcessorNode to capture audio
  const recorder = context.createScriptProcessor(bufferSize, numChannels, numChannels);
  device.node.connect(recorder);
  recorder.connect(context.destination); // Keep live output audible

  recorder.onaudioprocess = (e) => {
    const inputBuffer = e.inputBuffer;
    const left = inputBuffer.getChannelData(0);
    const right = inputBuffer.getChannelData(1);

    const samplesToCopy = Math.min(bufferSize, totalSamples - audioData.index);
    for (let i = 0; i < samplesToCopy; i++) {
      audioData.left[audioData.index + i] = left[i];
      audioData.right[audioData.index + i] = right[i];
    }
    audioData.index += samplesToCopy;

    if (audioData.index >= totalSamples) {
      recorder.disconnect();
      device.node.disconnect(recorder);
      exportAudioBuffer(audioData, sampleRate);
    }
  };

  // UI feedback
  let remaining = duration;
  document.getElementById('export-audio').disabled = true;

  const token = setInterval(() => {
    let rm_str = remaining < 0 ? "0" : `${remaining}`;
    remaining--;
    let ct = `запись (${rm_str}с)...`;
    document.getElementById('export-audio').textContent = ct;
  }, 1000);

  // Stop after 60 seconds if not already stopped
  setTimeout(() => {
    if (audioData.index < totalSamples) {
      recorder.disconnect();
      device.node.disconnect(recorder);
      exportAudioBuffer(audioData, sampleRate);
    }
    clearInterval(token);
  }, duration * 1000);
}

function exportAudioBuffer(audioData, sampleRate) {
  // Create AudioBuffer
  const audioBuffer = new AudioBuffer({
    length: audioData.index,
    numberOfChannels: 2,
    sampleRate: sampleRate
  });
  audioBuffer.copyToChannel(audioData.left.subarray(0, audioData.index), 0);
  audioBuffer.copyToChannel(audioData.right.subarray(0, audioData.index), 1);

  // Export as WAV
  const wavBuffer = bufferToWave(audioBuffer);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rnbo_output.wav';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Reset UI
  document.getElementById('export-audio').disabled = false;
  document.getElementById('export-audio').textContent = 'записать и скачать аудио-анамнез';
  console.log('Recording exported as WAV');
}


