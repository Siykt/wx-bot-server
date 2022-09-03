import jsonLogic from 'json-logic-js';

jsonLogic.add_operation('regex', function (pattern, subject) {
  if (typeof pattern === 'string') {
    pattern = new RegExp(pattern);
  }
  return pattern.test(subject);
});

export default jsonLogic;
