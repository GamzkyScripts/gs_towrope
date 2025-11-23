let ESX = null;
let QBCore = null;

if (GetResourceState('es_extended') == 'started') {
    ESX = exports['es_extended'].getSharedObject();
} else if (GetResourceState('qb-core') == 'started') {
    QBCore = exports['qb-core'].GetCoreObject();
}

const CanUseTowrope = (playerId) => {
    // If no required jobs are set, allow all players
    if (!Config.RequiredJobs || Config.RequiredJobs.length === 0) {
        return true;
    }

    let playerJobName = null;

    if (ESX) {
        const xPlayer = ESX.GetPlayerFromId(playerId);
        if (xPlayer && xPlayer.job && xPlayer.job.name) {
            playerJobName = xPlayer.job.name;
        }
    } else if (QBCore) {
        const Player = QBCore.Functions.GetPlayer(playerId);
        if (Player && Player.PlayerData && Player.PlayerData.job && Player.PlayerData.job.name) {
            playerJobName = Player.PlayerData.job.name;
        }
    }

    // If we couldn't get the job, deny access
    if (!playerJobName) {
        return false;
    }

    // Check if the player's job is in the required jobs array
    return Config.RequiredJobs.includes(playerJobName);
};


onNet('gs_towrope:AttachRope', (vehicleNetId, attachedVehicleNetId, yOffsetSign) => {
	const src = source;

	if (!CanUseTowrope(src)) return;

	const vehicle = NetworkGetEntityFromNetworkId(vehicleNetId);
	if (!DoesEntityExist(vehicle)) return;

	const attachedVehicle = NetworkGetEntityFromNetworkId(attachedVehicleNetId);
	if (!DoesEntityExist(attachedVehicle)) return;

	Entity(vehicle).state.RopeAttachedVehicle = [attachedVehicleNetId, yOffsetSign];
});

onNet('gs_towrope:DetachRope', (vehicleNetId) => {
	const src = source;

	if (!CanUseTowrope(src)) return;

	const vehicle = NetworkGetEntityFromNetworkId(vehicleNetId);
	if (!DoesEntityExist(vehicle)) return;

	Entity(vehicle).state.RopeAttachedVehicle = null;
});

onNet('gs_towrope:StartWindRope', (vehicleNetId, attachedVehicleNetId) => {
	const src = source;

	// Check if the vehicle exists
	const vehicle = NetworkGetEntityFromNetworkId(vehicleNetId);
	if (!DoesEntityExist(vehicle)) return;

	// Check if the attached vehicle exists
	const attachedVehicle = NetworkGetEntityFromNetworkId(attachedVehicleNetId);
	if (!DoesEntityExist(attachedVehicle)) return;

	// Start the winding on the entity owner
	const entityOwner = NetworkGetEntityOwner(attachedVehicle);
	emitNet('gs_towrope:StartWindRopeClient', entityOwner, vehicleNetId);
});

onNet('gs_towrope:StopWindRope', (vehicleNetId, attachedVehicleNetId, yOffsetSign) => {
	const src = source;

	// Check if the vehicle exists
	const vehicle = NetworkGetEntityFromNetworkId(vehicleNetId);
	if (!DoesEntityExist(vehicle)) return;

	// Check if the attached vehicle exists
	const attachedVehicle = NetworkGetEntityFromNetworkId(attachedVehicleNetId);
	if (!DoesEntityExist(attachedVehicle)) return;

	// Stop the winding on the entity owner
	const entityOwner = NetworkGetEntityOwner(attachedVehicle);
	emitNet('gs_towrope:StopWindRopeClient', entityOwner, vehicleNetId);

	// Ensure all the clients have the same rope length
	emitNet('gs_towrope:RopeResetLenghtClient', -1, vehicleNetId, attachedVehicleNetId, yOffsetSign);
});

onNet('gs_towrope:RopeResetLength', (vehicleNetId, attachedVehicleNetId, yOffsetSign) => {
	const src = source;

	// Check if the vehicle exists
	const vehicle = NetworkGetEntityFromNetworkId(vehicleNetId);
	if (!DoesEntityExist(vehicle)) return;

	// Check if the attached vehicle exists
	const attachedVehicle = NetworkGetEntityFromNetworkId(attachedVehicleNetId);
	if (!DoesEntityExist(attachedVehicle)) return;

	// Ensure all the clients have the same rope length
	emitNet('gs_towrope:RopeResetLenghtClient', -1, vehicleNetId, attachedVehicleNetId, yOffsetSign);
});
