Functions = {};

Functions.IsPlayerDead = () => {
	const ped = PlayerPedId()
	let isDead = IsEntityDead(ped)
	return isDead
}

Functions.GetClosestVehicle = ({ coords, range }) => {
	const _range = range || 9999;
    const _coords = coords || GetEntityCoords(PlayerPedId());
    let [closestDist, closestEntity] = [0, 0];
    const GamePool = GetGamePool('CVehicle');
    for (let i = 0; i < GamePool.length; i++) {
        const entCoords = GetEntityCoords(GamePool[i]);
            const entDist = Functions.CalcDist(_coords, entCoords);
            if (entDist < _range && (closestDist == 0 || closestDist > entDist)) {
                closestEntity = GamePool[i];
                closestDist = entDist;
            }
    }
    return closestEntity;
};

Functions.PlayAnim = async (ped, dict, anim, options) => {
	const { blend, infinite, flag } = options;
	RequestAnimDict(dict);
	while (!HasAnimDictLoaded(dict)) {
		await Delay(50);
	}
	const duration = infinite == true ? -1 : GetAnimDuration(dict, anim) * 1000;
	TaskPlayAnim(ped, dict, anim, blend || 8.0, blend || 8.0, duration, flag || 1, 1.0);
	RemoveAnimDict(dict);
};

Functions.LoadModel = (model) => {
	const modelHash = Functions.GetModelHash(model);
	const isModelValid = Functions.IsModelValid(modelHash);
	if (isModelValid) {
		return new Promise(async (resolve, reject) => {
			RequestModel(modelHash);
			while (!HasModelLoaded(modelHash)) {
				await Delay(50);
			}
			resolve();
		});
	}
};

Functions.GetModelHash = (model) => {
	return typeof model == 'string' ? GetHashKey(model) : model;
};

Functions.IsModelValid = (model) => {
	const modelHash = Functions.GetModelHash(model);
	return Boolean(IsModelInCdimage(modelHash) && IsModelValid(modelHash));
};

Functions.ShowNotification = ({ message }) => {
	BeginTextCommandThefeedPost('STRING');
	AddTextComponentSubstringPlayerName(message);
	EndTextCommandThefeedPostTicker(false, true);
};

Functions.CalcDist = (coords1, coords2) => {
	const xDist = coords1[0] - coords2[0];
	const yDist = coords1[1] - coords2[1];
	const zDist = coords1[2] - coords2[2];
	return Math.sqrt(xDist * xDist + yDist * yDist + zDist * zDist);
};

const Delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function DrawText3D(coords, text) {
	const [x, y, z] = coords;
	const [onScreen, screenX, screenY] = GetScreenCoordFromWorldCoord(x, y, z);

	if (onScreen) {
		const width = text.length / 400;

		SetTextScale(0.35, 0.35);
		SetTextFont(4);
		SetTextColour(255, 255, 255, 225);
		SetTextCentre(true);
		BeginTextCommandDisplayText('STRING');
		AddTextComponentSubstringPlayerName(text);
		EndTextCommandDisplayText(screenX, screenY);
		DrawRect(screenX, screenY + 0.0125, width + 0.015, 0.03, 40, 10, 40, 70);
	}
}