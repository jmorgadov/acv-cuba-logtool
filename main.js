var pilotInfo = new Object();

function getPilot(pilot) {
	if (pilotInfo[pilot] == undefined) {
		pilotInfo[pilot] = new Object();
		pilotInfo[pilot]["duration"] = 0;
		pilotInfo[pilot]["destroyed"] = 0;
		pilotInfo[pilot]["objDestroyed"] = [];
	}
	return pilotInfo[pilot];
}

function hasBeenDestroyed(event) {
	primaryObj = event.getElementsByTagName("PrimaryObject")[0];
	pilotDestroyed = primaryObj.getElementsByTagName("Pilot");
	if (pilotDestroyed.length > 0) {
		pilot = getPilot(pilotDestroyed[0].textContent);
		pilot["destroyed"] += 1;
		return;
	}

	secondaryObj = event.getElementsByTagName("SecondaryObject");
	if (secondaryObj.length > 0) {
		pilot = secondaryObj[0].getElementsByTagName("Pilot");
		if (pilot.length > 0) {
			pilot = getPilot(pilot[0].textContent);
			pilot["objDestroyed"].push(primaryObj.getElementsByTagName("Name")[0].textContent);
		}
	}
}

function hasTakeOff(event, time) {
	pilot = getPilot(event.getElementsByTagName("PrimaryObject")[0].getElementsByTagName("Pilot")[0].textContent);
	pilot["takeoff"] = time;
}

function hasLanded(event, time) {
	pilot = getPilot(event.getElementsByTagName("PrimaryObject")[0].getElementsByTagName("Pilot")[0].textContent);
	var takeoff = pilot["takeoff"];
	var landing = time;
	var duration = landing - takeoff;
	var minutes = duration / 3600;
	pilot["duration"] += minutes;
}

function parseXml(xmlString) {
	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(xmlString, "text/xml");
	var events = xmlDoc.getElementsByTagName("Event");
	pilotInfo = new Object();
	for (var event of events) {
		var action = event.getElementsByTagName("Action")[0].textContent;
		var time = event.getElementsByTagName("Time")[0].textContent;
		var primary = event.getElementsByTagName("PrimaryObject")[0];
		if (action == "HasTakenOff") {
			hasTakeOff(event, time);
		}
		if (action == "HasLanded") {
			hasLanded(event, time);
		}
		if (action == "HasBeenDestroyed") {
			hasBeenDestroyed(event);
		}
	}

	ShowLogs(pilotInfo);
}


function addPilotNameCol(trElem, pilot) {
	var tdElem = document.createElement("td");
	tdElem.className = "py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white";
	tdElem.innerHTML = pilot;
	trElem.appendChild(tdElem);
}

function addInfoCol(trElem, info) {
	var tdElem = document.createElement("td");
	tdElem.className = "py-4 px-6";
	tdElem.innerHTML = info;
	trElem.appendChild(tdElem);
}

function ShowLogs(pilotsInfo) {
	var pilotsDiv = document.getElementById("pilots");
	pilotsDiv.innerHTML = "";
	for (pilot in pilotsInfo) {
		var pilotDiv = document.createElement("tr");
		pilotDiv.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700";
		console.log(pilotDiv.className);
		addPilotNameCol(pilotDiv, pilot);
		addInfoCol(pilotDiv, pilotsInfo[pilot]["duration"].toFixed(2).toString());
		addInfoCol(pilotDiv, pilotsInfo[pilot]["destroyed"])
		addInfoCol(pilotDiv, pilotsInfo[pilot]["objDestroyed"].length.toString())
		pilotsDiv.appendChild(pilotDiv);
	}
}

const inputElement = document.getElementById("input");
inputElement.addEventListener("change", handleFiles, false);
function handleFiles() {
	const file = this.files[0];
	if (file) {
		const reader = new FileReader();
		reader.readAsText(file, "UTF-8");
		reader.onload = (evt) => {
			parseXml(evt.target.result);
		};
		reader.onerror = (evt) => {
			document.getElementById("fileContents").innerHTML = "error reading file";
		};
	}
}
