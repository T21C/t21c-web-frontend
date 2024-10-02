export const parseJudgements = (updatedForm) => {
    const judgementFields = ['tooEarly', 'early', 'ePerfect', 'perfect', 'lPerfect', 'late'];
    
    const parsedJudgements = {};

    judgementFields.forEach((field) => {
        const parsedValue = parseInt(updatedForm[field], 10);
        parsedJudgements[field] = Number.isNaN(parsedValue) ? null : parsedValue;
    });
    console.log(judgementFields.map((field) => parsedJudgements[field]));
    
    return judgementFields.map((field) => parsedJudgements[field]);
  };