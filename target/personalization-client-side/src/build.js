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
const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

require("dotenv").config({ path: path.resolve(process.cwd(), "..", ".env") });
const {
  EDGE_CONFIG_ID_WITH_ANALYTICS,
  ORGANIZATION_ID,
  CLIENT_CODE,
  PROPERTY_ID,
  SERVER_DOMAIN,
  FPID,
  demoDecisionScopeNames,
} = process.env;

const templates = [
  {
    name: "alloy",
    filenames: ["alloy"],
    template: fs.readFileSync(
      path.resolve(path.join(__dirname, "alloy.handlebars")),
      "utf-8"
    ),
    library: "https://cdn1.adoberesources.net/alloy/2.19.1/alloy.min.js",
  },
  {
    name: "atjs",
    filenames: ["atjs", "index"],
    template: fs.readFileSync(
      path.resolve(path.join(__dirname, "atjs.handlebars")),
      "utf-8"
    ),
    library: "at.js",
  },
  {
    name: "atjs-shim",
    filenames: ["atjs-shim"],
    template: fs.readFileSync(
      path.resolve(path.join(__dirname, "atjs-shim.handlebars")),
      "utf-8"
    ),
    library: "alloy.js",
  },
];

templates.forEach((templateDef) => {
  const { name, filenames = [], template, library } = templateDef;

  const renderTemplate = Handlebars.compile(template);

  const html = renderTemplate({
    templateName: name,
    edgeConfigId: EDGE_CONFIG_ID_WITH_ANALYTICS,
    orgId: ORGANIZATION_ID,
    clientCode: CLIENT_CODE,
    serverDomain: SERVER_DOMAIN,
    propertyId: PROPERTY_ID,
    library,
    FPID,
    demoDecisionScopeNames: demoDecisionScopeNames,
  });

  // Write to build folder. Copy the built file and deploy
  filenames.forEach((filename) => {
    fs.writeFile(
      path.join(__dirname, "..", "public", `${filename}.html`),
      html,
      (err) => {
        if (err) console.log(err);
        console.log("File written succesfully");
      }
    );
  });
});
