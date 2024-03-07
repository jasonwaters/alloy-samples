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

function sendDisplayEvent(proposition, itemIds = [], tokens = []) {
  const { id, scope, scopeDetails = {} } = proposition;
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
              items: Array.from(new Set(itemIds)).map((id) => ({ id })),
            },
          ],
          propositionEventType: {
            display: 1,
          },
          propositionAction: {
            tokens: Array.from(new Set(tokens)),
          },
        },
      },
    },
  });
}

function sendInteractEvent(
  proposition,
  label = undefined,
  token = undefined,
  itemIds = []
) {
  const { id, scope, scopeDetails = {} } = proposition;

  alloy("sendEvent", {
    xdm: {
      eventType: "decisioning.propositionInteract",
      _experience: {
        decisioning: {
          propositions: [
            {
              id: id,
              scope: scope,
              scopeDetails: scopeDetails,
              items: Array.from(new Set(itemIds)).map((id) => ({ id })),
            },
          ],
          propositionEventType: {
            interact: 1,
          },
          propositionAction: {
            label: label,
            tokens: [token],
          },
        },
      },
    },
  });
}

function renderMoviesMenu(proposition) {
  if (!proposition) {
    return;
  }

  const { items: propositionItems = [] } = proposition;

  const menuItems = propositionItems.reduce(
    (menuItems, propositionItem) => [
      ...menuItems,
      ...propositionItem.data.content.items.map((item) => {
        const img = /.+\/(\w+)\.jpg/.exec(item.img || "");
        const icon = img && img.length > 0 ? `/img/${img[1]}-icon.webp` : "";
        return { ...item, icon, id: propositionItem.id, proposition };
      }),
    ],
    []
  );

  const dropdown = document.querySelector("#movies-dropdown");
  if (!dropdown) {
    return;
  }

  const template = Handlebars.compile(`
  <ul class="dropdown-menu">
    {{#each menuItems}}
      <li title="{{description}}"  data-item-index="{{@index}}">
        <a href="#movie-{{title}}"><img src="{{icon}}" width="60" height="60" /> {{title}}</a>
      </li>
   {{/each}}
  </ul>
`);

  const renderMenuItems = () => {
    dropdown.insertAdjacentHTML("beforeend", template({ menuItems }));

    const dropdownLinks = document.querySelectorAll(
      "#movies-dropdown > ul.dropdown-menu a"
    );

    dropdownLinks.forEach((link) => {
      link.addEventListener("click", (evt) => {
        const li = evt.target.closest("li");
        if (!li) {
          return;
        }
        const idx = parseInt(li.getAttribute("data-item-index"), 10);

        const {
          proposition,
          clickLabel,
          clickToken,
          id: itemId,
        } = menuItems[idx];
        sendInteractEvent(proposition, clickLabel, clickToken, [itemId]);
      });
    });

    sendDisplayEvent(
      proposition,
      menuItems.map((item) => item.id),
      menuItems.map((item) => item.clickToken)
    );
    dropdown.removeEventListener("click", renderMenuItems);
  };

  dropdown.addEventListener("click", renderMenuItems);
}

function applyPersonalization(surfaceName) {
  const metadata = {
    [`web://${window.location.hostname}/#hello`]: {
      selector: "div.page-header",
      actionType: "insertAfter",
    },
    [`web://${window.location.hostname}/#movies`]: {
      selector: "p#paragraph-text-2",
      actionType: "insertAfter",
    },
    [`web://aepdemo.com/#movies`]: {
      selector: "p#paragraph-text-2",
      actionType: "insertAfter",
    },
  };

  return function (result) {
    const { propositions = [] } = result;

    if (propositions.length === 0) {
      return;
    }

    if (surfaceName === "web://aepdemo.com/#movies-menu") {
      renderMoviesMenu(
        propositions.find((proposition) => proposition.scope === surfaceName)
      );
      return;
    }

    if (!metadata[surfaceName]) {
      return;
    }

    alloy("applyPropositions", {
      propositions: propositions.filter((p) => {
        const { scope } = p;
        return scope.endsWith(surfaceName);
      }),
      metadata: {
        [surfaceName]: metadata[surfaceName],
      },
    });
  };
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
