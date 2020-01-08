
export function isFlagColor(flag: Flag, colors: flagColors) {
  return flag.color == colors.first && flag.secondaryColor == colors.second;
}

export const FLAG_ROOM_ATTACK: flagColors = { first: COLOR_BLUE, second: COLOR_BLUE };
export const FLAG_TARGET_ATTACK: flagColors = { first: COLOR_BLUE, second: COLOR_BROWN };
export const FLAG_ATTACK_CONTROLLER: flagColors = { first: COLOR_BLUE, second: COLOR_CYAN };

export const FLAG_NEW_COLONY: flagColors = { first: COLOR_WHITE, second: COLOR_WHITE };

export const FLAG_EXTENSION_BUILD: flagColors = { first: COLOR_RED, second: COLOR_RED };
export const FLAG_EXTENSION_COMPLETE: flagColors = { first: COLOR_RED, second: COLOR_GREEN };
export const FLAG_LABS: flagColors = { first: COLOR_BROWN, second: COLOR_BROWN };
