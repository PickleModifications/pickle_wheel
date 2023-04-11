local Controls = {}
local DeviceSettings = {}
local PressedBinds = {}

local lastUpdate = 0

RegisterNUICallback("updateInput", function(data, cb) 
    for k,v in pairs(data) do 
        local value = v
        if value > 0.9999 then 
            value = 0.9999
        elseif value < -0.9999 then
            value = -0.9999
        end
        if k == "wheelAxis" then 
            if value > 0 then 
                value = value + DeviceSettings.wheelDeadzone
            elseif value < 0 then
                value = value - DeviceSettings.wheelDeadzone
            end
        end
        Controls[k] = value
    end
    cb(true)
end)

RegisterNUICallback("buttonUpdate", function(data, cb)
    ButtonInteract(data.index, data.pressed)
    cb(true)
end)

RegisterNUICallback("updateSettings", function(data, cb)
    UpdateSettings(data)
    cb(true)
end)

RegisterNUICallback("close", function(data, cb)
    SetNuiFocus(false, false)
    cb(true)
end)

function ButtonInteract(index, pressed)
    local bind = DeviceSettings.binds[index .. ""]
    if bind then 
        if bind.type == "control" and bind.values[2] ~= nil then
            if pressed then 
                local startTime = GetGameTimer()
                PressedBinds[index] = true
                CreateThread(function()
                    local key = tonumber(bind.values[2])
                    while lastUpdate < startTime and PressedBinds[index] do
                        SetControlNormal(0, key, 1.0)
                        SetControlNormal(1, key, 1.0)
                        SetControlNormal(2, key, 1.0)
                        Wait(0)
                    end
                end)
            else
                PressedBinds[index] = false
            end
        elseif bind.type == "command" then 
            if pressed and bind.values[1] ~= nil then 
                PressedBinds[index] = true
                ExecuteCommand(bind.values[1])
            elseif not pressed and bind.values[2] ~= nil then
                PressedBinds[index] = false
                ExecuteCommand(bind.values[2])
            end
        end
    end
end

function UpdateSettings(data)
    lastUpdate = GetGameTimer()
    DeviceSettings = data
    SetResourceKvp("picklewheel", json.encode(DeviceSettings))
end

RegisterCommand("wheel", function()
    SetNuiFocus(true, true)
    SendNUIMessage({
        type = "open"
    })
end)

CreateThread(function()
    Wait(1000)
    DeviceSettings = json.decode(GetResourceKvpString("picklewheel"))
    SendNUIMessage({
        type = "updateSettings",
        data = DeviceSettings
    })
    while true do
        SetControlNormal(0, 59, Controls.wheelAxis or 0.0)
        SetControlNormal(0, 71, Controls.throttleAxis or 0.0)
        SetControlNormal(0, 72, Controls.brakeAxis or 0.0)
        -- SetControlNormal(0, 59, Controls.axisValueClutch or 0.0)
        Wait(0)
    end
end)