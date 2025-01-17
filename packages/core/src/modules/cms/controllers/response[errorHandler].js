/* eslint-disable global-require */
/* eslint-disable guard-for-in */
/* eslint-disable import/no-import-module-exports */
import React from 'react';
import { inspect } from 'util';
import Html from '../../../lib/components/Html';
import { Alert } from '../../../lib/components/modal/Alert';
import { AppProvider } from '../../../lib/context/app';

const { renderToString } = require('react-dom/server');

module.exports = async (request, response, stack, next) => {
  const promises = [];
  Object.keys(stack).forEach((id) => {
    // Check if middleware is async
    if (stack[id] instanceof Promise) {
      promises.push(stack[id]);
    }
  });

  try {
    // Wait for all async middleware to be completed
    await Promise.all(promises);

    // Check if this is a redirection or not.
    if (response.$redirectUrl) {
      response.redirect(response.statusCode || 302, response.$redirectUrl);
    } else if (response.get('Content-Type') === 'application/json; charset=utf-8') { // Check if the response is Json or not.
      response.json(response.$body || {});
    } else {
      // eslint-disable-next-line max-len
      // Check if `$body` is empty or not. If yes, we consider the content is already generated by previous middlewares
      // eslint-disable-next-line no-lonely-if
      if (response.$body && response.$body !== '') {
        response.send(response.$body);
      } else {
        const source = renderToString(
          <AppProvider value={response.context}>
            <Alert>
              <Html
                bundle={response.context.bundleJs}
                appContext={`var appContext = ${inspect(response.context, { depth: 10, maxArrayLength: null })}`}
              />
            </Alert>
          </AppProvider>
        );
        response.send(`<!DOCTYPE html><html id="root">${source}</html>`);
      }
    }
  } catch (error) {
    next(error);
  }
};
