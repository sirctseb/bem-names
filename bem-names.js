export const StringModifiers = {
  WARN: 'warn',
  ALLOW: 'allow',
  PASS_THROUGH: 'passThrough',
};


export const StylesPolicy = {
  WARN: 'warn',
  IGNORE: 'ignore',
};


export const defaultConfig = {
  separators: { element: '__', modifier: '--', keyValue: '-' },
  states: {},
  styles: undefined,
  stylesPolicy: StylesPolicy.WARN,
  joinWith: ' ',
  bemLike: true,
  keyValue: false,
  stringModifiers: StringModifiers.WARN,
  parseModifier: defaultParseModifier,
};


export function bemNames(...args) {
  return customBemNamesInner(defaultConfig, args[0], args.slice(1));
}


export function bemNamesFactory(block, customConfig={}){
  const config = {
    ...defaultConfig,
    ...customConfig,
    separators: { ...defaultConfig.separators, ...customConfig.separators },
  };

  if (config.bemLike && !isString(block)) {
    throw TypeError(`block name: "${block}" is not a string`);
  }

  return (...args) => customBemNamesInner(config, block, args);
}


export function customBemNames(customConfig, block, ...args) {
  const config = {
    ...defaultConfig,
    ...customConfig,
    separators: { ...defaultConfig.separators, ...customConfig.separators },
  };

  return customBemNamesInner(config, block, args);
}


export function customBemNamesInner(config, block, args=[]) {
  if (config.bemLike && isString(args[0])) {
    const bemName = block + config.separators.element + args.shift();
    return applyMods(config, bemName, args);
  } else if (!config.bemLike) {
    return applyMods(config, undefined, [block].concat(args));
  }

  return applyMods(config, block, args);
}

export function applyMods(config, bemName, modifiers) {
  const {
    bemLike,
    parseModifier,
    joinWith,
    stringModifiers,
    styles,
    stylesPolicy,
  } = config;
  let toExtract = modifiers;
  let toPass = [];

  if (bemLike && stringModifiers === StringModifiers.PASS_THROUGH) {
    toPass = modifiers.filter(isString);
  }

  const extracted = toExtract.reduce(extractModifiers(config), []);

  let parsed = extracted;
  let toJoin = parsed;

  if (bemLike) {
    parsed = parsed.map((mod) => parseModifier(config, bemName, mod));
    toJoin = [bemName].concat(parsed, toPass);
  }

  if (styles != undefined) {
    toJoin = applyStyles(toJoin, styles, stylesPolicy);
  }

  return toJoin.join(joinWith);
}


export function applyStyles(toJoin, styles, stylesPolicy) {
  let fn = undefined;

  switch(stylesPolicy) {
    case StylesPolicy.IGNORE:
      fn = (acc, key) => key in styles ? acc.push(styles[key]) && acc : acc;
      break;

    case StylesPolicy.WARN:
      fn = (acc, key) => {
        if(key in styles) {
          acc.push(styles[key]);
        } else {
          console.warn(`Key ${key} is missing in styles`);
        }
        return acc;
      };
      break;

    default:
      throw new Error(`StylePolicy: "${stylesPolicy}" has invalid value`);
  }

  return toJoin.reduce(fn, []);
}


export function extractModifiers(config) {
  const keyValueSep = config.separators.keyValue;
  return (extracted, modifiers) => {
    if (Array.isArray(modifiers)) {
      return extracted.concat(modifiers);
    }

    if (typeof modifiers == 'object') {
      let objecExtrac = (k) => !!modifiers[k] && (extracted.push(k));

      if (config.bemLike && config.keyValue) {
        objecExtrac = (key) => {
          const value = modifiers[key];
          if (value === true) {
            extracted.push(key);
          } else if (value) {
            extracted.push(key + keyValueSep + value);
          }
        };
      }

      Object.keys(modifiers).forEach(objecExtrac);
      return extracted;
    }

    if (config.bemLike && config.stringModifiers == StringModifiers.WARN) {
      console.warn(`Provided modifier "${modifiers}" is now allowed!`);
      return extracted;
    }

    if (!config.bemLike || config.stringModifiers == StringModifiers.ALLOW) {
      extracted.push(modifiers);
    }

    return extracted;
  };
}


function isString(str) {
  return typeof str == 'string' || str instanceof String;
}


export function defaultParseModifier(config, bemName, modifier) {
  if (modifier in config.states) {
    return config.states[modifier];
  }

  return bemName + config.separators.modifier + modifier;
}
