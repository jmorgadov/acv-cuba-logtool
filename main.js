var pilotInfo = new Object();

var pilotsCallsigns = [
	"VIPER",
	"Xtreme",
	"Morga",
	"SkyHunter",
	"FARCUBA",
].sort()
var idOrder = 0;
var selectionHistory = new Object();

function getPilot(pilot) {
	if (pilotInfo[pilot] == undefined) {
		pilotInfo[pilot] = new Object();
		pilotInfo[pilot]["duration"] = 0;
		pilotInfo[pilot]["flights"] = 0;
		pilotInfo[pilot]["destroyed"] = 0;
		pilotInfo[pilot]["crashed"] = 0;
		pilotInfo[pilot]["hasTakenOff"] = false;
		pilotInfo[pilot]["objDestroyed"] = [];
	}
	return pilotInfo[pilot];
}

function getPilotFromPrimary(event) {
	primaryObj = event.getElementsByTagName("PrimaryObject")[0];
	pilot = primaryObj.getElementsByTagName("Pilot");
	if (pilot.length > 0) {
		return getPilot(pilot[0].textContent);
	}
	else {
		return null;
	}
}

function hasBeenDestroyed(event) {
	primaryObj = event.getElementsByTagName("PrimaryObject")[0];
	pilotDestroyed = primaryObj.getElementsByTagName("Pilot");
	secondaryObj = event.getElementsByTagName("SecondaryObject");
	if (pilotDestroyed.length > 0 && secondaryObj != null && secondaryObj.length > 0) {
		pilot = getPilot(pilotDestroyed[0].textContent);
		pilot["destroyed"] += 1;
		if (pilot["hasTakenOff"]) {
			// Not count as crashed
			pilot["crashed"] -= 1;
		}
		pilot["hasTakenOff"] = false;
		return;
	}

	if (secondaryObj.length > 0) {
		pilot = secondaryObj[0].getElementsByTagName("Pilot");
		if (pilot.length > 0) {
			pilot = getPilot(pilot[0].textContent);
			pilot["objDestroyed"].push(primaryObj.getElementsByTagName("Name")[0].textContent);
		}
	}
}

function hasTakeOff(event, time) {
	pilot = getPilotFromPrimary(event);
	if (pilot == null) {
		return;
	}
	pilot["takeoff"] = time;
	pilot["hasTakenOff"] = true;
	pilot["crashed"] += 1;
	pilot["flights"] += 1;
}

function hasLanded(event, time) {
	pilot = getPilot(event.getElementsByTagName("PrimaryObject")[0].getElementsByTagName("Pilot")[0].textContent);
	if (!pilot["hasTakenOff"]) {
		return;
	}
	var takeoff = pilot["takeoff"];
	var landing = time;
	var duration = landing - takeoff;
	var minutes = duration / 3600;
	pilot["duration"] += minutes;
	pilot["crashed"] -= 1;
	pilot["hasTakenOff"] = false;
}

function parseXml(xmlString) {
	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(xmlString, "text/xml");
	var events = xmlDoc.getElementsByTagName("Event");
	pilotInfo = new Object();
	selectionHistory = new Object();
	for (var event of events) {
		var action = event.getElementsByTagName("Action")[0].textContent;
		var time = event.getElementsByTagName("Time")[0].textContent;
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

function fixTable() {

}


function addPilotNameCol(trElem, pilot) {
	var tdElem = document.createElement("input");
	var list = "list" + pilot;
	tdElem.className = "py-4 px-6 font-medium bg-gray-0 text-gray-900 whitespace-nowrap dark:text-white";
	tdElem.value = pilot;
	tdElem.id = idOrder.toString();
	idOrder += 1;

	var datalist = document.createElement("datalist")
	datalist.id = list;

	var firstOp = document.createElement("option")
	firstOp.value = pilot;
	firstOp.textContent = pilot;
	datalist.appendChild(firstOp)
	selectionHistory[tdElem.id] = pilot;

	for (p of pilotsCallsigns) {
		if (p != pilot) {
			var op = document.createElement("option")
			op.value = p;
			op.textContent = p;
			datalist.appendChild(op)
		}
	}
	tdElem.appendChild(datalist);
	tdElem.setAttribute("list", list);
	trElem.appendChild(tdElem);

	tdElem.onchange = function(event) {
		var old = selectionHistory[tdElem.id];
		var selected = tdElem.value;
		selectionHistory[tdElem.id] = selected;
		info = pilotInfo[old];
		delete pilotInfo[old];
		if (selected in pilotInfo) {
			pilotInfo[selected].duration += info.duration;
			pilotInfo[selected].flights += info.flights;
			pilotInfo[selected].destroyed += info.destroyed;
			pilotInfo[selected].crashed += info.crashed;
			pilotInfo[selected].objDestroyed.push(...info.objDestroyed);
			pilotInfo[selected].takeoff = Math.max(pilotInfo[selected].takeoff, info.takeoff);
		}
		else {
			pilotInfo[selected] = info;
		}
		ShowLogs(pilotInfo);
	}
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
		addPilotNameCol(pilotDiv, pilot);
		addInfoCol(pilotDiv, pilotsInfo[pilot]["duration"].toFixed(2).toString());
		addInfoCol(pilotDiv, pilotsInfo[pilot]["flights"]);
		addInfoCol(pilotDiv, pilotsInfo[pilot]["destroyed"])
		addInfoCol(pilotDiv, pilotsInfo[pilot]["crashed"])
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
