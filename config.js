Config = {};

// Only these jobs can interact with the tow rope. Supports ESX and QBCore by default. If using a different framework, edit cl_playerjob.js.
Config.RequiredJobs = ['police', 'mechanic'];

// The keys through which the player controls the rope.
Config.Keys = {
	interact: 38,      // E key, also change keyIndicator below in Config.Locales
	cancel: 73,        // X key
	wind: 172,         // Arrow Up key
};

// All vehicles below have a tow rope that can be used. The x-y-z coordinates are the location with respect to the center of the vehicle, where to rope can be picked up.
Config.TowVehicles = {
	[GetHashKey('flatbed')]: [0.0, 0.9, 0.6],
	[GetHashKey('kamacho')]: [0.0, 2.6, 0.3],
	[GetHashKey('mesa3')]: [0.0, 2.2, 0.0],
};

// If you are using our flatbed script (https://gamzkystore.com/free-package/flatbed-script) and the flatbed is lowered, the rope attach point changes.
// This only works for the vehicle model defined under Config.FlatbedModel.
Config.FlatbedModel = GetHashKey('flatbed');
Config.FlatbedLowerd = [0.0, -3.5, 0.8];

// All labels and notifications are defined below.
Config.Locales = {
	rope: 'Towrope',
	cancel: 'Cancel',
	remove: 'Remove',
	attachCable: 'Attach Cable',
	keyIndicator: '[~b~E~s~] ',
	ropeTurnedOn: 'Winch ~b~turned on~s~.',
	ropeTurnedOff: 'Winch ~b~turned off~s~.',
	vehicleIsAttached: '~r~Cannot attach the rope to a vehicle that is already attached to another object.',
};

// The minimum and maximum rope length, recommendation is to keep this as is.
Config.MaxRopeLength = 25.0;
Config.MinimumRopeLength = 2.0;

