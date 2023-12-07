/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

function randomId(name) {
  return name + "-" + Math.floor(Math.random() * 10000000).toString(10);
}

function createIdentityPayload(
  id,
  authenticatedState = "ambiguous",
  primary = true
) {
  if (id.length === 0) {
    return undefined;
  }

  return {
    id,
    authenticatedState,
    primary,
  };
}

function sendTargetDisplayEvent(mbox) {
  if (!mbox.options) {
    console.log(
      `could not send display notification for ${mbox.name}.  missing options`
    );
    return;
  }

  const notifications = [
    {
      id: randomId("disp"),
      type: "display",
      timestamp: Date.now(),
      parameters: mbox.parameters,
      profileParameters: mbox.profileParameters,
      order: mbox.order,
      product: mbox.product,
      mbox: { name: mbox.name, state: mbox.state },
      tokens: mbox.options.map((e) => e.eventToken),
    },
  ];
  adobe.target.sendNotifications({
    request: { notifications },
  });
}

function sendAlloyDisplayEvent(decision) {
  const { id, scope, scopeDetails = {} } = decision;

  alloy("sendEvent", {
    xdm: {
      eventType: "decisioning.propositionDisplay",
      _experience: {
        decisioning: {
          propositions: [
            {
              id: id,
              scope: scope,
              scopeDetails: scopeDetails,
            },
          ],
        },
      },
    },
  });
}

function updateButtons(buttonActions) {
  buttonActions.forEach((buttonAction) => {
    const { id, text, content } = buttonAction;

    const element = document.getElementById(`action-button-${id}`);
    element.innerText = text;

    element.addEventListener("click", () => alert(content));
  });
}

function applyPersonalizationAtjs(decisionScopeNames) {
  return function (result) {
    const { execute, prefetch } = result;
    const { mboxes = [] } = execute || prefetch;

    decisionScopeNames.forEach((decisionScopeName) => {
      const mbox = mboxes.find((mbox) => mbox.name === decisionScopeName);

      if (mbox) {
        const { options = [] } = mbox;

        const { content = {} } = options.length > 0 ? options[0] : {};

        if (prefetch) {
          sendTargetDisplayEvent(mbox);
        }

        applyPersonalization(decisionScopeName, content);
      }
    });
  };
}

function applyPersonalizationAlloy(decisionScopeNames) {
  return function (result) {
    const { propositions = [], decisions = [] } = result;

    // send display event for the decision scope / target mbox
    decisions.forEach((decision) => sendAlloyDisplayEvent(decision));

    decisionScopeNames.forEach((decisionScopeName) => {
      const mbox = propositions.find(
        (proposition) => proposition.scope === decisionScopeName
      );

      if (mbox) {
        const { items = [] } = mbox;

        const { data = {} } = items.length > 0 ? items[0] : {};
        const { content = {} } = data;

        applyPersonalization(decisionScopeName, content);
      }
    });
  };
}

function applyPersonalization(decisionScopeName, content) {
  if (decisionScopeName === "aguaOffer") {
    const element = document.querySelector("img.target-offer");

    const {
      buttonActions = [],
      heroImageName = "demo-marketing-offer1-default.png",
    } = content;

    updateButtons(buttonActions);

    element.src = `img/${heroImageName}`;
  }

  if (decisionScopeName === "sample-favorite-color") {
    const { backgroundColor = "white" } = content;
    document.body.style.backgroundColor = backgroundColor;
  }
}

function displayError(err) {
  console.error(err);
  const containerElement = document.getElementById("main-container");
  if (!containerElement) {
    return;
  }

  containerElement.innerHTML = `<div id="error-detail" class="page-header">
                                      <h3>&#128565; There was an error</h3>
                                      <div class="alert alert-danger" role="alert">${err.message}</div>
                                    </div>`;
}

function changeRoute(viewName) {
  window.location = "#" + viewName;

  if (typeof adobe !== "undefined" && typeof adobe.target !== "undefined") {
    adobe.target.triggerView(viewName);
    return;
  }

  if (typeof alloy === "function") {
    alloy("sendEvent", {
      renderDecisions: true,
      xdm: {
        web: {
          webPageDetails: {
            viewName: viewName,
          },
        },
      },
    });
  }
}

window.onload = function () {
  if (window.location.hash) {
    changeRoute(window.location.hash.replace("#", ""));
  }

  window.addEventListener(
    "hashchange",
    function (evt) {
      // eslint-disable-next-line no-unused-vars
      var newURL = evt.newURL || location.hash;

      var parts = newURL.split("#");
      var route = parts[1];
      changeRoute(route);
    },
    false
  );
};

var urlParams = new URLSearchParams(window.location.search);
var favoriteColor = urlParams.get("favoriteColor");
