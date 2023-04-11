let device;
let dataDisplay;

let elemWheel;
let elemThrottle;
let elemBrake;
 
let loopRunning = false;
let deviceFound = false;
let deviceIndex;
let deviceSettings;

function updateSettings(data, forceUpdate) {
    var data = data || {
        inputs: {},
        binds: {}
    }
    if (!forceUpdate) {
        deviceSettings = {
            deviceIndex: data.inputs[0] || "null",
            wheelDeadzone: data.inputs[1] || 0.25,
            wheelRadius: data.inputs[2] || 900,
            wheelIndex: data.inputs[3] || 0,
            throttleIndex: data.inputs[4] || 1,
            brakeIndex: data.inputs[5] || 2,
            binds: data.binds
        }
        fetch('https://pickle_wheel/updateSettings', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deviceSettings)
        })
        .then(response => {  })
        .catch(error => {  });
    }
    else {
        deviceSettings = data;
        if (deviceIndex != deviceSettings.deviceIndex) {
            deviceIndex = deviceSettings.deviceIndex
            if (deviceIndex != "null") {
                initApp(deviceIndex)
            }
        }
    }
}

function safeValue(value) {
    if (value) {
        return value
    }
    else {
        return null
    }
}

function bindHtml(type, index, val1, val2) {
    let bind;
    if (type == "control") {
        bind = `
            <div>
                <b>Button #${index}</b>
            </div>
            <div>
                <select id="button-select-${index}">
                    <option value="control" selected>Control Pad</option>
                    <option value="command">Command</option>
                </select>
                <input id="button-input-${index}-0" type="number" min="0" placeholder="Control Type" ${val1 != undefined ? 'value="'+val1+'"' : ""}>
                <input id="button-input-${index}-1" type="number" min="0" placeholder="Control Index" ${val2 != undefined ? 'value="'+val2+'"' : ""}>
            </div>
        `
    }
    else if (type == "command") {
        bind = `
            <div>
                <b>Button #${index}</b>
            </div>
            <div>
                <select id="button-select-${index}">
                    <option value="control">Control Pad</option>
                    <option value="command" selected>Command</option>
                </select>
                <input id="button-input-${index}-0" type="text" placeholder="Pressed" ${val1 != undefined ? 'value="'+val1+'"' : ""}>
                <input id="button-input-${index}-1" type="text" placeholder="Released" ${val2 != undefined ? 'value="'+val2+'"' : ""}>
            </div>
        `
    }
    return bind;
}

function initApp(index) {
    var device;
    var deviceOptions = `<option value="null">Select Device</option>`;
    let gps = navigator.getGamepads();
    for(let gp of gps) {
        if (gp) {
            if (gp.index == index) {
                device = gp
                deviceOptions += `<option value=${gp.index} selected>${gp.id}</option>`
            }
            else {
                deviceOptions += `<option value=${gp.index}>${gp.id}</option>`
            }
        }
    }
    if (!device || !deviceSettings) {
        deviceIndex = null;
        $("#middle").html(`
        <h3>Device</h3>
        <div class="option">
            <div>
                <b>Select Device</b>
            </div>
            <div>
                <select id="input-0">
                    ${deviceOptions}
                </select>
            </div>
        </div>`)
        return;
    }
    var html = `
        <h3>Device</h3>
        <div class="option">
            <div>
                <b>Select Device</b>
            </div>
            <div>
                <select id="input-0">
                    ${deviceOptions}
                </select>
            </div>
        </div>
        <div class="option">
            <div>
                <b>Wheel Deadzone</b>
            </div>
            <div>
                <input id="input-1" type="number" step="0.01" value="${deviceSettings.wheelDeadzone}" min="0.0" max="1.0">
            </div>
        </div>
        <div class="option">
            <div>
                <b>Wheel Radius</b>
            </div>
            <div>
                <input id="input-2" type="number" step="1" value="${deviceSettings.wheelRadius}" min="0" max="1800">
            </div>
        </div>
        <div class="option">
            <div>
                <b>Wheel Input Index</b>
            </div>
            <div>
                <input id="input-3" type="number" value="${deviceSettings.wheelIndex}">
            </div>
        </div>
        <div class="option">
            <div>
                <b>Throttle Input Index</b>
            </div>
            <div>
                <input id="input-4" type="number" value="${deviceSettings.throttleIndex}">
            </div>
        </div>
        <div class="option">
            <div>
                <b>Brake Input Index</b>
            </div>
            <div>
                <input id="input-5" type="number" value="${deviceSettings.brakeIndex}">
            </div>
        </div>
        
        <h3>Binding</h3>
    `
    for (var i=0; i<device.buttons.length; i++) {
        let optionHTML;
        if (deviceSettings.binds[i] && deviceSettings.binds[i].type) {
            optionHTML = bindHtml(deviceSettings.binds[i].type, i, deviceSettings.binds[i].values[0], deviceSettings.binds[i].values[1])
        }
        else {
            optionHTML = bindHtml("control", i, undefined, undefined)
        } 
        var bind = `
            <div class="option" id="button-${i}">
                ${optionHTML}
            </div>
        `
        html += bind;
    }
    $(".middle").html(html);
    deviceIndex = index
    gameLoop(index)
}

function gameLoop(index) {
    let gps = navigator.getGamepads();
    for(let gp of gps) {
        if(gp && gp.index == index) {
            device = gp;
            break;
        }
    }
    if(device && index == deviceIndex) {
        let wheelAxis    = device.axes[deviceSettings.wheelIndex];
        let throttleAxis = device.axes[deviceSettings.throttleIndex];
        let brakeAxis    = device.axes[deviceSettings.brakeIndex];

        fetch('https://pickle_wheel/updateInput', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                wheelAxis: wheelAxis,
                throttleAxis: (throttleAxis   * -1) + 1,
                brakeAxis: (brakeAxis    * -1) + 1
            })
        })
        .then(response => {  })
        .catch(error => {  });

        // convert wheel axis to angle
        wheelAxis = Math.round(deviceSettings.wheelRadius / 2 * wheelAxis * 1000) / 1000;
 
        // normalize pedals axes to range 0-1
        throttleAxis = (throttleAxis * -1 + 1) / 2;
        brakeAxis    = (brakeAxis    * -1 + 1) / 2;
        
        elemWheel.style.transform = 'rotate('+wheelAxis+'deg)';
 
        elemThrottle.style.height = (100 - throttleAxis * 100)+'%';
        elemBrake.style.height    = (100 - brakeAxis    * 100)+'%';
        
        for (var i=0; i<device.buttons.length; i++) {
            if (device.buttons[i].pressed && !$("#button-" + i).hasClass("pressed")) {
                $("#button-" + i).addClass("pressed");
                fetch('https://pickle_wheel/buttonUpdate', {
                    method: 'post',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        index: i,
                        pressed: true
                    })
                })
                .then(response => {  })
                .catch(error => {  });
            }
            else if (!device.buttons[i].pressed && $("#button-" + i).hasClass("pressed")) {
                $("#button-" + i).removeClass("pressed");
                fetch('https://pickle_wheel/buttonUpdate', {
                    method: 'post',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        index: i,
                        pressed: false
                    })
                })
                .then(response => {  })
                .catch(error => {  });
            }
        }
        requestAnimationFrame(function() {
            gameLoop(index)
        });
    }
}

$(document).ready(function() {
    var html = `
    <h3>Device</h3>
    <div class="option">
        <div>
            <b>Select Device</b>
        </div>
        <div>
            <select id="input-0">
            </select>
        </div>
    </div>
    `
    $(".middle").html(html);

    $(document).on("change", "select", function () {
        var id = $(this).parent().parent().attr("id")
        if (id) {
            if (id.includes("button-")) {
                var index = id.replaceAll("button-", "");
                var bind = bindHtml($(this).val(), index)
                $("#" + id).html(bind);
            }
            return;
        }
        var id = $(this).attr("id")
        if (id == "input-0") {
            var value = $(this).val();
            if (value != "null") {
                initApp(value)
            }
            else {    
                deviceIndex = null
                var deviceOptions = `<option value="null">Select Device</option>`;
                let gps = navigator.getGamepads();
                for(let gp of gps) {
                    if (gp) {
                        deviceOptions += `<option value=${gp.index}>${gp.id}</option>`
                    }
                }
                var html = `
                <h3>Device</h3>
                <div class="option">
                    <div>
                        <b>Select Device</b>
                    </div>
                    <div>
                        <select id="input-0">
                        ${deviceOptions}
                        </select>
                    </div>
                </div>
                `
                $(".middle").html(html);
            }
        }
    });
    $(document).on("click", "#save-button", function () {
        if ($("#input-0").val() == "null") {
            return;
        }
        var inputs = {};
        var binds = {};
        // Device Settings
        for (let i=0; i<6; i++) {
            var element = $("#input-"+ i);
            if (element && element.val()) {
                inputs[i] = element.val()
            }
            else {
                inputs[i] = null;
            }
        }
        // Binds
        for (let i=0; i<device.buttons.length; i++) {
            var element = $("#button-"+ i);
            if (element) {
                binds[i] = {
                    type: $("#button-select-"+i).val(),
                    values: [safeValue($("#button-input-"+i+"-0").val()), safeValue($("#button-input-"+i+"-1").val())]
                }
            }
        }
        updateSettings({
            inputs: inputs,
            binds: binds
        })
        initApp(deviceIndex)
    });
    $(document).on("click", "#close", function () {
        $("#container").animate({opacity: 0}, 'fast');
        fetch('https://pickle_wheel/close', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
        .then(response => {  })
        .catch(error => {  });
    });
})
 
window.addEventListener('gamepadconnected', function(e) {
    dataDisplay  = document.getElementById('dataDisplay');
    elemWheel    = document.getElementById('wheel');
    elemThrottle = document.querySelector('#throttle > span');
    elemBrake    = document.querySelector('#brake > span');
    elemClutch   = document.querySelector('#clutch > span');
    var deviceOptions = `<option value="null">Select Device</option>`;
    let gps = navigator.getGamepads();
    for(let gp of gps) {
        if (gp) {
            deviceOptions += `<option value=${gp.index}>${gp.id}</option>`
        }
    }
    $("#input-0").html(deviceOptions)
});

window.addEventListener("message", function(ev) {
    var event = ev.data
    if (event.type == "updateSettings") {
        updateSettings(event.data, true)
    }
    else if (event.type == "open") {
        $("#container").animate({opacity: 1}, 'fast');
    }
})