var pilotInfo = new Object();

var pilotsCallsigns = [
	"VIPER",
	"Xtreme",
	"Morga",
	"SkyHunter",
	"FARCUBA",
	"Razor",
].sort()
var idOrder = 0;
var selectionHistory = new Object();
var charts = [];
var tapeLoaded = null;
var ws;

const labelOption = {
	show: true,
	position: 'right',
	align: 'left',
	formatter: '{c}',
	fontSize: 10,
};

function getPilot(pilot) {
	if (pilotInfo[pilot] == undefined) {
		pilotInfo[pilot] = new Object();
		pilotInfo[pilot]["duration"] = 0;
		pilotInfo[pilot]["flights"] = 0;
		pilotInfo[pilot]["destroyed"] = 0;
		pilotInfo[pilot]["crashed"] = 0;
		pilotInfo[pilot]["hasTakenOff"] = false;
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
		pilotsDiv.appendChild(pilotDiv);
	}
}

const inputElement = document.getElementById("input");
inputElement.addEventListener("change", handleFiles, false);
function handleFiles() {
	const file = this.files[0];
	if (file) {
		const reader = new FileReader();
		tapeLoaded = file;
		reader.readAsText(file, "UTF-8");
		reader.onload = (evt) => {
			parseXml(evt.target.result);
		};
		reader.onerror = (evt) => {
			document.getElementById("fileContents").innerHTML = "error reading file";
		};
	}
}


// --------------------------------------------------------------------------------
// GENERAL LOGBOOK
// --------------------------------------------------------------------------------

const genInputElement = document.getElementById("generalLogInput");
genInputElement.addEventListener("change", logbookHandleFiles, false);
function logbookHandleFiles() {
	const file = this.files[0];
	if (file) {
		const reader = new FileReader();
		reader.readAsArrayBuffer(file, "UTF-8");
		reader.onload = (evt) => {
			parseGeneralLogbook(evt.target.result);
		};
		reader.onerror = (evt) => {
			document.getElementById("fileContents").innerHTML = "error reading file";
		};
	}
}

function showPilotFlightHours(info, order) {
	var chartDom = document.getElementById("flight_hours");
	var myChart = echarts.init(chartDom);
	charts.push(myChart);
	var option;

	var names = [];
	var flightHours = [];
	for (pilot of order) {
		var pilotData = info[pilot];
		names.push(pilot);
		flightHours.push(pilotData.duration.toFixed(2));
	}

	option = {
		title: {
			text: 'Horas de vuelo',
			x: 'center',
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'shadow'
			}
		},
		legend: {},
		xAxis: {
			type: 'value',
		},
		yAxis: {
			type: 'category',
			data: names,
		},
		series: [
			{
				type: 'bar',
				label: labelOption,
				data: flightHours,
			}
		]
	};
	option && myChart.setOption(option);
}

function showCrasehsAndDestroyed(info, order) {
	var chartDom = document.getElementById("crashed_destroyed");
	chartDom.innerHTML = "";
	var myChart = echarts.init(chartDom);
	charts.push(myChart);
	var option;

	var names = [];
	var crashes = [];
	var destroyed = [];
	for (pilot of order) {
		var pilotData = info[pilot];
		names.push(pilot);
		crashes.push(pilotData.crashed);
		destroyed.push(pilotData.destroyed);
	}

	option = {
		title: {
			text: 'Crashes y derrivos',
			x: 'center',
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'shadow'
			}
		},
		legend: {
			y: 'bottom',
		},
		xAxis: {
			type: 'value',
		},
		yAxis: {
			type: 'category',
			data: names,
		},
		series: [
			{
				name: 'Estrellado',
				type: 'bar',
				label: labelOption,
				data: crashes,
				color: '#dd4444',
			},
			{
				name: 'Derrivado',
				type: 'bar',
				label: labelOption,
				data: destroyed,
				color: '#ffaa00',
			}
		]
	};

	option && myChart.setOption(option);
}


function parseGeneralLogbook(logbookFile) {
	// const ExcelJS = require('exceljs');
	var lastTapeLabel = document.getElementById("last_tape");
	var tapeErrorLabel = document.getElementById("tape_error");
	tapeErrorLabel.setAttribute("hidden", true);
	var columnsPerPilot = 5;
	const wb = new ExcelJS.Workbook();
	wb.xlsx.load(logbookFile).then(() => {
		console.log("Logbook loaded");
		ws = wb.getWorksheet('logbook');
		const namesRow = ws.getRow(2);
		const names = [];
		const pInfo = {};
		var j = 2;
		while (namesRow.getCell(j).value) {
			var name = namesRow.getCell(j).value;
			names.push(name);
			pInfo[name] = {
				duration: 0,
				flights: 0,
				destroyed: 0,
				crashed: 0,
				column: j,
			};
			j += columnsPerPilot;
		}

		var tapes = [];

		var lastTapeRow = 3;
		var lastTapeName = ws.getRow(lastTapeRow).getCell(1).text;
		// get a copy of the row
		while (lastTapeName != "") {
			tapes.push(lastTapeName);
			for (var i = 0; i < names.length * columnsPerPilot; i += 5) {
				var name = names[i / columnsPerPilot];
				var col = i + 2;
				var duration = ws.getRow(lastTapeRow).getCell(col).value;
				var crashes = ws.getRow(lastTapeRow).getCell(col + 1).value;
				var destroyed = ws.getRow(lastTapeRow).getCell(col + 2).value;
				var flights = ws.getRow(lastTapeRow).getCell(col + 3).value;
				info = pInfo[names[i / columnsPerPilot]];
				if (duration != null) {
					info["duration"] += duration;
				}
				if (crashes != null) {
					info["crashed"] += crashes;
				}
				if (destroyed != null) {
					info["destroyed"] += destroyed;
				}
				if (flights != null) {
					info["flights"] += flights;
				}
			}
			lastTapeRow += 1;
			lastTapeName = ws.getRow(lastTapeRow).getCell(1).text;
		}

		lastTapeName = tapes[tapes.length - 1];
		lastTapeLabel.textContent = "Último log guardado: " + lastTapeName;
		lastTapeLabel.removeAttribute("hidden");

		if (tapeLoaded != null) {
			if (tapes.includes(tapeLoaded.name)) {
				tapeErrorLabel.removeAttribute("hidden");
				tapeErrorLabel.textContent = "Este log ya fue guardado !!";
				return;
			}
			else {
				ws.getRow(lastTapeRow).getCell(1).value = tapeLoaded.name;
				for (pilot in pilotInfo) {
					if (pilot in pInfo) {
						var col = pInfo[pilot].column;
						ws.getRow(lastTapeRow).getCell(col).value = pilotInfo[pilot].duration;
						ws.getRow(lastTapeRow).getCell(col + 1).value = pilotInfo[pilot].crashed;
						ws.getRow(lastTapeRow).getCell(col + 2).value = pilotInfo[pilot].destroyed;
						ws.getRow(lastTapeRow).getCell(col + 3).value = pilotInfo[pilot].flights;
						pInfo[pilot].duration += pilotInfo[pilot].duration;
						pInfo[pilot].crashed += pilotInfo[pilot].crashed;
						pInfo[pilot].destroyed += pilotInfo[pilot].destroyed;
						pInfo[pilot].flights += pilotInfo[pilot].flights;
					}
					else {
						names.push(pilot);
						var col = j;
						j += columnsPerPilot;
						ws.getRow(2).getCell(col).value = pilot;
						ws.getRow(lastTapeRow).getCell(col).value = pilotInfo[pilot].duration;
						ws.getRow(lastTapeRow).getCell(col + 1).value = pilotInfo[pilot].crashed;
						ws.getRow(lastTapeRow).getCell(col + 2).value = pilotInfo[pilot].destroyed;
						ws.getRow(lastTapeRow).getCell(col + 3).value = pilotInfo[pilot].flights;
						pInfo[pilot] = {
							duration: pilotInfo[pilot].duration,
							flights: pilotInfo[pilot].flights,
							destroyed: pilotInfo[pilot].destroyed,
							crashed: pilotInfo[pilot].crashed,
							column: col,
						};
					}
				}
			}
		}

		order = Object.keys(pInfo);
		order.sort(function(a, b) {
			return pInfo[a].duration - pInfo[b].duration;
		});

		for (ch of charts) {
			ch.dispose();
		}
		charts = [];

		showPilotFlightHours(pInfo, order);
		showCrasehsAndDestroyed(pInfo, order);

		var saveButton = document.getElementById("save");
		saveButton.removeAttribute('hidden');
		saveButton.onclick = function() {
			wb.xlsx.writeBuffer().then((data) => {
				const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' });
				var name = prompt("Save as:", "general_logbook.xlsx");
				saveAs(blob, name);
			});
		};

	})
}
