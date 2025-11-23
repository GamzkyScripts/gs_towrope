// When editing this file, also check the code in sv_main.js, there are additional job checks present for security reasons.

let ESX = null;
let QBCore = null;

if (GetResourceState('es_extended') == 'started') {
    ESX = exports['es_extended'].getSharedObject();
} else if (GetResourceState('qb-core') == 'started') {
    QBCore = exports['qb-core'].GetCoreObject();
}

// This function should return the player's job, adjust to your framework if required
const GetPlayerJob = () => {
    if (ESX) {
        const playerData = ESX.GetPlayerData();
        if (playerData && playerData.job && playerData.job.name) {
            return playerData.job.name;
        }
    } else if (QBCore) {
        const playerData = QBCore.Functions.GetPlayerData();
        if (playerData && playerData.job && playerData.job.name) {
            return playerData.job.name;
        }
    }

    return 'unemployed';
}