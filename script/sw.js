/*
 *  Push Notifications codelab
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

/* eslint-env browser, serviceworker, es6 */

'use strict';
// https://developers.google.com/web/updates/2015/03/introduction-to-fetch

let applicationServerPublicKey = null;
/* eslint-enable max-len */

let curentTarget = null;

let option = {
  
};

function urlB64ToUint8Array(base64String) {
  console.log("sw = > " + base64String);
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 푸시 알림 표시
self.addEventListener('push', function (event) {
  console.log(event);
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);
  option = JSON.parse(event.data.text());
  const title = option.title;
  const options = {
    body: option.body,
    icon: option.logo,
    badge: option.logo,
    image: option.image, 
    actions : [
      {
        action : 'coffee-action',
        title : 'test',
        icon : '/img/logo2.png'
      }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 푸시 알림 클릭시 반응 
self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification click Received.');
  console.log(event);
  event.notification.close();
  console.log(option);
  const url = option.url;
  event.waitUntil(
    clients.openWindow(url)
  );
});

self.addEventListener('pushsubscriptionchange', function (event) {
  console.log('[Service Worker]: \'pushsubscriptionchange\' event fired.');
  const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    })
    .then(function (newSubscription) {
      // TODO: Send to application server
      console.log('[Service Worker] New subscription: ', newSubscription);
    })
  );
});

// Install Service Worker
self.addEventListener('install', function (event) {
  curentTarget = event.currentTarget;
  console.log('서비스 워커 install!');

  fetch("https://10.1.73.154:8443/LabServer/sw/chk", {
      method: "post",
      mode: "cors",
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json', // sent request
        'Accept': 'application/json' // expected data sent back
      },
    }).then((resp) => resp.json())
    .then(function (data) {
      console.log('Request succeeded with JSON response', data);
    })
    .catch(function (error) {
      console.log('Request failed', error);
    });
});

// Service Worker Active
self.addEventListener('activate', function (event) {
  console.log('서비스 워커 activate!');
});

/**
 * 메인쪽에서 MSG 받기
 */
self.addEventListener('message', function (event) {
  console.log("SW Received Message: " + event.data);
  let data = dataTrans(event.data);
  console.log(data);
  
  if(data.pushpage !== void 0){
    option.pushpage = data.pushpage;
  }

});

function check() {
  fetch("https://10.1.73.154:8443/LabServer/sw/chk?"+"publickey="+applicationServerPublicKey, {
      method: "post",
      mode: "cors",
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json', // sent request
        'Accept': 'application/json' // expected data sent back
      },
    }).then((resp) => resp.json())
    .then(function (data) {
      console.log('Request succeeded with JSON response', data);
    })
    .catch(function (error) {
      console.log('Request failed', error);
    });
}


function dataTrans(data) {
  let obj = data.substring(0, 3);

  if ((obj === "arr") || (obj === "obj")) {
    data = JSON.parse(data.substring(3, data.length));
    if (data.publickey !== void 0) {
      applicationServerPublicKey = data.publickey;
    }
  } 

  return data;
}
