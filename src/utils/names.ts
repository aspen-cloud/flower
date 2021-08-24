export function kebabToTitleCase(name: string) {
  return name.split("-").map(capitalizeFirstLetter).join(" ");
}

export function titleToKebabCase(name: string) {
  return name
    .split(" ")
    .map((word) => word.toLowerCase())
    .join("-");
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
