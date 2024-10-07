export const arraySum = (arr) => {
    return arr.reduce(add, 0);
}

function add(accumulator, a) {
  return accumulator + a;
}