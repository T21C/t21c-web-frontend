
function arraySum(arr) {
    return arr.reduce(add, 0);
}

function add(accumulator, a) {
  return accumulator + a;
}

export default function calcAcc (inp, raw=false)
    {
        
        const result = (inp[3] +
            (inp[2] + inp[4]) * 0.75 +
            (inp[1] + inp[5]) * 0.4 +
            (inp[0]) * 0.2)
           / arraySum(inp)
        if (raw){
            return result
        }
        const digits = 4
        const rounded = Math.round(result * Math.pow(10, digits)) / Math.pow(10, digits);
        return rounded
    }

