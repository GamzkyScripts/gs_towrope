let roping = false;
let carriedRope = null;
let hookProp = null;

setTick(async () => {
	let ms = 1000;

	// Ensure correct job
	if (Config.RequiredJobs && Config.RequiredJobs.length > 0) {
		const playerJob = GetPlayerJob();
		if (!Config.RequiredJobs.includes(playerJob)) {
			await Delay(ms);
			return;
		}
	}

	// Ensure player is not in a vehicle
	const ped = PlayerPedId();
	if (IsPedInAnyVehicle(ped, true)) {
		await Delay(ms);
		return;
	}

	// Ensure player is not dead
	if (Functions.IsPlayerDead()) {
		await Delay(ms);
		return;
	}

	// Check for a vehicle
	const pedCoords = GetEntityCoords(ped, true);
	let vehicle = Functions.GetClosestVehicle({
		coords: pedCoords,
		range: 5,
	});

	if (!DoesEntityExist(vehicle)) {
		await Delay(ms);
		return;
	}

	// Ensure vehicle is not broken down
	if (GetVehicleEngineHealth(vehicle) <= 100.0) {
		await Delay(ms);
		return;
	}

	// Check the vehicle class
	const vehicleModel = GetEntityModel(vehicle);
	if (Config.TowVehicles[vehicleModel] == null) {
		await Delay(ms);
		return;
	}

	// Define the pickup coords
	let TowVehicleCoords = Config.TowVehicles[vehicleModel];
	if (TowVehicleCoords == Config.TowVehicles[Config.FlatbedModel] && Entity(vehicle).state.bedLowered) TowVehicleCoords = Config.FlatbedLowerd;

	// Ensure the player is close to the attach point
	const offsetCoords = GetOffsetFromEntityInWorldCoords(vehicle, ...TowVehicleCoords);
	const dist = Functions.CalcDist(pedCoords, offsetCoords);
	if (dist > 1.5) {
		await Delay(ms);
		return;
	}

	// Slow down tick
	ms = 0;

	// Display the correct text
	const ropeAttachedVehicle = Entity(vehicle).state.RopeAttachedVehicle != null;
	let text = roping ? Config.Locales['cancel'] : Config.Locales['rope'];
	text = ropeAttachedVehicle ? Config.Locales['remove'] : text;
	text = dist < 1 ? Config.Locales['keyIndicator'] + text : text;
	DrawText3D(offsetCoords, text);

	// Click handler
	if (dist < 1 && IsControlJustReleased(0, Config.Keys.interact)) {
		if (ropeAttachedVehicle) {
			emitNet('gs_towrope:DetachRope', NetworkGetNetworkIdFromEntity(vehicle));
			Functions.PlayAnim(ped, 'anim@amb@clubhouse@tutorial@bkr_tut_ig3@', 'machinic_loop_mechandplayer', { infinite: true, blend: 2.0, flag: 1 });
			await Delay(2500)
			ClearPedTasks(ped)
		} else {
			await HandleRope(vehicle, offsetCoords);
		}
	}

	if (ms > 0) await Delay(ms);
});

const HandleRope = async (originVehicle, originCoords) => {
	const ped = PlayerPedId();

	// Handle the case of an existing rope
	if (roping) {
		ClearPedTasks(ped);
		DeleteRope(carriedRope);
		DeleteEntity(hookProp);
		roping = false;
		return;
	}

	// Play animation to pickup the the rope.
	Functions.PlayAnim(ped, 'anim@amb@clubhouse@tutorial@bkr_tut_ig3@', 'machinic_loop_mechandplayer', { infinite: true, blend: 2.0, flag: 1 });
	await Delay(2500)
	ClearPedTasks(ped)

	// Spawn the hook and play the animation, give some time  for the prop to get to the right position in the animation
	Functions.PlayAnim(ped, 'move_p_m_zero_rucksack', 'idle', { infinite: true, blend: 2.0, flag: 35 });
	hookProp = await AddPropToPlayer('prop_rope_hook_01', 6286, 0.05, 0.02, -0.02, 84.0, -191.0, 29.0);
	await Delay(750);

	// Create the rope and attach the entities
	carriedRope = await CreateRope(...originCoords, 0.0, 0.0, 0.0, 0.5, 0.5, 0.1);
	const boneCoords = GetWorldPositionOfEntityBone(ped, GetPedBoneIndex(ped, 40269));
	AttachEntitiesToRope(carriedRope, ped, originVehicle, ...boneCoords, ...originCoords, Config.MaxRopeLength, 0, 0);
	roping = true;

	const carryLoop = setTick(async () => {
		// Disable entering vehicles
		DisableControlAction(0, 23, true);

		// If canceled, delete the current rope attached to the player and reset the state and stop this tick.
		if (IsControlPressed(0, Config.Keys.cancel) || IsPedInAnyVehicle(ped, true) || IsPedRagdoll(ped) || !roping) {
			ClearPedTasks(ped);
			RemoveRope(carriedRope);
			DeleteEntity(hookProp);
			clearTick(carryLoop);
			roping = false;
		}

		// Find the closest vehicle and display text to attach rope
		const pedCoords = GetEntityCoords(ped);
		let closestVehicle = Functions.GetClosestVehicle({
			coords: pedCoords,
			range: 10,
		});

		// Only continue if a vehicle is found
		if (closestVehicle != 0 && closestVehicle != originVehicle) {
			let text = Config.Locales['attachCable'];

			// Get the vehicle model dimensions and text positions
			const [maximum, minimum] = GetModelDimensions(GetEntityModel(closestVehicle));
			const yOffset = (maximum[1] - minimum[1]) / 2;
			const vehicleOffsetBack = GetOffsetFromEntityInWorldCoords(closestVehicle, 0.0, yOffset, 0.0);
			const vehicleOffsetFront = GetOffsetFromEntityInWorldCoords(closestVehicle, 0.0, -yOffset, 0.0);

			// Check if front or back is closest to the ped
			let vehicleOffset = vehicleOffsetBack;
			let yOffsetSign = 1;
			if (Functions.CalcDist(pedCoords, vehicleOffsetBack) > Functions.CalcDist(pedCoords, vehicleOffsetFront)) {
				vehicleOffset = vehicleOffsetFront;
				yOffsetSign = -1;
			}

			// Display the correct text
			const dist = Functions.CalcDist(pedCoords, vehicleOffset);
			text = dist < 2.0 ? Config.Locales['keyIndicator'] + text : text;
			DrawText3D(vehicleOffset, text);

			// If the ped is close enough, allow attachment of the rope
			if (dist < 2.0) {
				if (IsControlPressed(0, Config.Keys.interact)) {
					// Check if the found vehicle is not attached to anything.
					if (IsEntityAttached(closestVehicle)) {
						Functions.ShowNotification({ message: Config.Locales['vehicleIsAttached'] });
						return;
					}

					// Animation attaching the rope.
					const vehicleHeading = GetEntityHeading(closestVehicle);
					const pedHeading = yOffsetSign == -1 ? vehicleHeading - 180.0 : vehicleHeading;
					SetEntityHeading(ped, pedHeading);
					Functions.PlayAnim(ped, 'anim@amb@clubhouse@tutorial@bkr_tut_ig3@', 'machinic_loop_mechandplayer', { infinite: true, blend: 2.0, flag: 51 });
					await Delay(2500)
					ClearPedTasks(ped)

					// If vehicle is still close, attach the rope
					if (Functions.CalcDist(pedCoords, GetOffsetFromEntityInWorldCoords(closestVehicle, 0.0, yOffsetSign * yOffset, 0.0)) < 3.0) {
						// Update the server with the rope start coords and the to be attached vehicle
						emitNet(
							'gs_towrope:AttachRope',
							NetworkGetNetworkIdFromEntity(originVehicle),
							NetworkGetNetworkIdFromEntity(closestVehicle),
							yOffsetSign
						);
					}

					ClearPedTasks(ped);
					RemoveRope(carriedRope);
					DeleteEntity(hookProp);
					clearTick(carryLoop);
					roping = false;
				}
			}
		}
	});
};

const CreateRope = async (x1, y1, z1, x2, y2, z2, maxLength, initLength, minLength) => {
	RopeLoadTextures();
	while (!RopeAreTexturesLoaded()) {
		await Delay(10);
	}
	retval = AddRope(x1, y1, z1, x2, y2, z2, maxLength, 4, initLength, minLength, 1.0, false, false, true, 5.0, false, 0);
	retval = retval[0];
	return retval;
};

const RemoveRope = async (rope) => {
	if (DoesRopeExist(rope)) {
		DeleteRope(rope);
		RopeUnloadTextures();
	}
};

const AddPropToPlayer = async (propName, bone, off1, off2, off3, rot1, rot2, rot3) => {
	const Player = PlayerPedId();
	const [x, y, z] = GetEntityCoords(Player);

	await Functions.LoadModel(propName);

	animProp = CreateObject(GetHashKey(propName), x, y, z + 0.2, true, true, true);
	while (!DoesEntityExist(animProp)) {
		await Delay(50);
	}

	SetEntityCollision(animProp, false, false);
	if (typeof bone == 'string') {
		bone = GetEntityBoneIndexByName(Player, bone);
	} else {
		bone = GetPedBoneIndex(Player, bone);
	}
	AttachEntityToEntity(animProp, Player, bone, off1, off2, off3, rot1, rot2, rot3, true, true, false, true, 1, true);
	SetModelAsNoLongerNeeded(propName);

	return animProp;
};

const GetAttachedVehicleRopePosition = (attachedVehicle, yOffsetSign) => {
	const [maximum, minimum] = GetModelDimensions(GetEntityModel(attachedVehicle));
	const yOffset = (maximum[1] - minimum[1]) / 2;
	const attachedVehicleRopePosition = GetOffsetFromEntityInWorldCoords(attachedVehicle, 0.0, yOffsetSign * yOffset + 0.5 * yOffsetSign, 0.0);
	return attachedVehicleRopePosition;
};

const ropeList = {};
AddStateBagChangeHandler('RopeAttachedVehicle', null, async (bagName, key, RopeAttachedVehicleInfo, reserved, replicated) => {
	// Only continue if a vehicle is attached with a rope
	if (RopeAttachedVehicleInfo == null) return;

	// Ensure the main vehicle is loaded
	let startTime = GetGameTimer();
	let vehicle = 0;
	while (vehicle == 0 && GetGameTimer() - startTime < 1000) {
		vehicle = GetEntityFromStateBagName(bagName);
		await Delay(0);
	}
	if (vehicle == 0) return;

	// Check the vehicle class for the rope attach position
	const vehicleModel = GetEntityModel(vehicle);
	if (Config.TowVehicles[vehicleModel] == null) return;

	// Define the pickup coords
	let TowVehicleCoords = Config.TowVehicles[vehicleModel];
	if (TowVehicleCoords == Config.TowVehicles[Config.FlatbedModel] && Entity(vehicle).state.bedLowered) TowVehicleCoords = Config.FlatbedLowerd;
	const vehicleRopePosition = GetOffsetFromEntityInWorldCoords(vehicle, ...TowVehicleCoords);

	// Ensure the attachedVehicle is loaded
	const attachedVehicleNetId = RopeAttachedVehicleInfo[0];
	startTime = GetGameTimer();
	while (!NetworkDoesNetworkIdExist(attachedVehicleNetId) && GetGameTimer() - startTime < 1000) {
		await Delay(0);
	}
	if (!NetworkDoesNetworkIdExist(attachedVehicleNetId)) return;
	const attachedVehicle = NetworkGetEntityFromNetworkId(attachedVehicleNetId);
	if (!DoesEntityExist(attachedVehicle)) {
		return;
	}

	// Get the sign of the y-offset and the attached vehicle rope position
	const yOffsetSign = RopeAttachedVehicleInfo[1];
	const attachedVehicleRopePosition = GetAttachedVehicleRopePosition(attachedVehicle, yOffsetSign);

	// Ensure the distance between the vehicles is not to large
	const vehicleDist = Functions.CalcDist(vehicleRopePosition, attachedVehicleRopePosition);
	if (vehicleDist > Config.MaxRopeLength + 2.5) return; // +2.5 to take into account the [Press E] distance and some extra (desync) margin

	// Create the rope
	const rope = await CreateRope(...vehicleRopePosition, 0.0, 0.0, 0.0, 0.5, vehicleDist, 0.1); // Max dist at 0.5 to fix the rope texture going through the endpoint ()
	AttachEntitiesToRope(rope, vehicle, attachedVehicle, ...vehicleRopePosition, ...attachedVehicleRopePosition, vehicleDist + 0.5, 0, 0); // Some extra margin with +0.5
	ropeList[vehicle] = rope;

	// Create a loop to check if the rope needs to be deleted
	let winding = false;
	const ropeLoop = setTick(async () => {
		let ms = 1000;
		if (!DoesEntityExist(vehicle) || !DoesEntityExist(attachedVehicle) || Entity(vehicle).state.RopeAttachedVehicle == null) {
			DeleteRope(rope);
			delete ropeList[vehicle];
			clearTick(ropeLoop);
			return;
		}

		const vehicleSpeed = GetEntitySpeed(vehicle);
		const attachedVehicleSpeed = GetEntitySpeed(attachedVehicle);
		if (vehicleSpeed > 10 || attachedVehicleSpeed > 10) {
			emitNet('gs_towrope:DetachRope', NetworkGetNetworkIdFromEntity(vehicle));
			await Delay(500);
			return;
		}

		// In case the distance is short and the vehicle is frozen, it should be unfrozen (seperate from if-statement below due to the flag != 131)
		const dist = RopeGetDistanceBetweenEnds(rope);
		const playerId = PlayerId();
		if (dist < Config.MinimumRopeLength && IsEntityPositionFrozen(vehicle)) {
			const vehicleEntityOwner = NetworkGetEntityOwner(vehicle);
			if (playerId == vehicleEntityOwner) {
				Functions.ShowNotification({ message: Config.Locales['ropeTurnedOff'] });
				FreezeEntityPosition(vehicle, false);
			}
		}

		// In case the rope distance is short or the vehicle is moving, dont allow any interaction and stop the rope from moving
		const ropeFlags = GetRopeFlags(rope);
		const attachedVehicleEntityOwner = NetworkGetEntityOwner(attachedVehicle);
		if ((dist < Config.MinimumRopeLength && ropeFlags != 131) || (GetEntitySpeed(vehicle) > 0.5 && ropeFlags != 131)) {
			// Flag 131 is standard, 163 is winding
			if (playerId == attachedVehicleEntityOwner) {
				StopRopeWinding(rope);
				emitNet(
					'gs_towrope:RopeResetLength',
					NetworkGetNetworkIdFromEntity(vehicle),
					NetworkGetNetworkIdFromEntity(attachedVehicle),
					yOffsetSign
				);
			} else {
				emitNet(
					'gs_towrope:StopWindRope',
					NetworkGetNetworkIdFromEntity(vehicle),
					NetworkGetNetworkIdFromEntity(attachedVehicle),
					yOffsetSign
				);
			}
			await Delay(ms);
			return;
		}

		// Check if the ped is the driver of the main vehicle to allow interaction
		const ped = PlayerPedId();
		const driver = GetPedInVehicleSeat(vehicle, -1);
		if (ped == driver && dist >= Config.MinimumRopeLength) {
			ms = 0;
			if (IsControlJustReleased(0, Config.Keys.wind)) {
				if (!winding) {
					// Stop winding
					winding = true;
					FreezeEntityPosition(vehicle, true);
					Functions.ShowNotification({ message: Config.Locales['ropeTurnedOn'] });
					if (playerId == attachedVehicleEntityOwner) {
						StartRopeWinding(rope);
					} else {
						emitNet('gs_towrope:StartWindRope', NetworkGetNetworkIdFromEntity(vehicle), NetworkGetNetworkIdFromEntity(attachedVehicle));
					}
				} else {
					// Start winding
					if (playerId == attachedVehicleEntityOwner) {
						StopRopeWinding(rope);
						emitNet(
							'gs_towrope:RopeResetLength',
							NetworkGetNetworkIdFromEntity(vehicle),
							NetworkGetNetworkIdFromEntity(attachedVehicle),
							yOffsetSign
						);
					} else {
						emitNet(
							'gs_towrope:StopWindRope',
							NetworkGetNetworkIdFromEntity(vehicle),
							NetworkGetNetworkIdFromEntity(attachedVehicle),
							yOffsetSign
						);
					}
					winding = false;
					FreezeEntityPosition(vehicle, false);
					Functions.ShowNotification({ message: Config.Locales['ropeTurnedOff'] });
				}
				await Delay(500);
			}
		}

		if (ms > 0) await Delay(ms);
	});
});

onNet('gs_towrope:StartWindRopeClient', async (vehicleNetId) => {
	// Check if the net id and entity exist
	if (!NetworkDoesNetworkIdExist(vehicleNetId)) return;
	const vehicle = NetworkGetEntityFromNetworkId(vehicleNetId);
	if (!DoesEntityExist(vehicle)) return;

	// Avoid the start of winding in case the distance is not synced correctly
	const dist = RopeGetDistanceBetweenEnds(ropeList[vehicle]);
	if (dist < Config.MinimumRopeLength) return;

	if (ropeList[vehicle] != null) {
		StartRopeWinding(ropeList[vehicle]);
	}
});

onNet('gs_towrope:StopWindRopeClient', async (vehicleNetId) => {
	// Check if the net id and entity exist
	if (!NetworkDoesNetworkIdExist(vehicleNetId)) return;
	const vehicle = NetworkGetEntityFromNetworkId(vehicleNetId);
	if (!DoesEntityExist(vehicle)) return;

	if (ropeList[vehicle] != null) {
		StopRopeWinding(ropeList[vehicle]);
	}
});

onNet('gs_towrope:RopeResetLenghtClient', async (vehicleNetId, attachedVehicleNetId, yOffsetSign) => {
	// Check if the net id and entity exist
	if (!NetworkDoesNetworkIdExist(vehicleNetId)) return;
	const vehicle = NetworkGetEntityFromNetworkId(vehicleNetId);
	if (!DoesEntityExist(vehicle)) return;

	// If the player is the entity owner of the flatbed, and the flatbed is frozen, it should be unfrozen
	// This is done as extra, incase the flatbed is somehow still frozen
	if (PlayerId() == NetworkGetEntityOwner(vehicle)) { 
		if (IsEntityPositionFrozen(vehicle)); FreezeEntityPosition(vehicle, false);
	}

	// Check if the net id and entity exist
	if (!NetworkDoesNetworkIdExist(attachedVehicleNetId)) return;
	const attachedVehicle = NetworkGetEntityFromNetworkId(attachedVehicleNetId);
	if (!DoesEntityExist(attachedVehicle)) return;

	// Only continue if the rope already exists
	if (ropeList[vehicle] != null) {
		const dist = RopeGetDistanceBetweenEnds(ropeList[vehicle]);
		if (dist > Config.MaxRopeLength + 2.5) return;
		// Check the vehicle class for the rope attach position
		const vehicleModel = GetEntityModel(vehicle);
		if (Config.TowVehicles[vehicleModel] == null) return;
		let TowVehicleCoords = Config.TowVehicles[vehicleModel];
		if (TowVehicleCoords == Config.TowVehicles[Config.FlatbedModel] && Entity(vehicle).state.bedLowered)
			TowVehicleCoords = Config.FlatbedLowerd;
		const vehicleRopePosition = GetOffsetFromEntityInWorldCoords(vehicle, ...TowVehicleCoords);

		// Get the rope position for the attachedVehicle
		const attachedVehicleRopePosition = GetAttachedVehicleRopePosition(attachedVehicle, yOffsetSign);
		AttachEntitiesToRope(ropeList[vehicle], vehicle, attachedVehicle, ...vehicleRopePosition, ...attachedVehicleRopePosition, dist, 0, 0);
	}
});
