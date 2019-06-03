let push = (function () {

    /**
     * REST API
     */
    let serverURL = "https://10.1.73.154:8443/LabServer";
    let keyURL = "/get/key";
    let regURL = "/set/endPoint";
    let keyDelURL = "/del/key";

    /**
     * 서버키 
     */
    let _applicationServerPublicKey = null;

    /**
     * 구독 여부
     */
    let _isSubscribed = null;

    /**
     * 서비스 워커 
     */
    let _swRegistration = null;

    /**
     * 공개키
     */
    let _key = null;

    /**
     * 구독 JSON
     */
    let _subscription = null;

    /**
     * 구독 JSON.String
     */
    let _subscriptionData = null;

    /*
     * 서비스워커 JS 읽을 때 생성.
     */
    $.ajax({
        async: false,
        url: serverURL + keyURL,
        dataType: "json",
        type: 'post',
        success: function (result) {
            console.log(result);
            if (result !== null) {
                _key = result;
                _applicationServerPublicKey = result.publicKey;
            }
        }
    });

    if (('serviceWorker' in navigator && 'PushManager' in window)) {
        // 서비스 워커 사용 가능
        navigator.serviceWorker.register('script/sw.js').then(function (swReg) {
            // console.log('Service Worker is registered', swReg);
            swReg.update(); // 서비스워커 수동 트리거 
            _swRegistration = swReg;
            swReg.active.postMessage("obj" + JSON.stringify({
                publickey: _key.publicKey
            }));
        }).catch(function (error) {
            console.error('Service Worker Error', error);
        });
    } else {
        console.warn('Push messaging is not supported');
        console.warn('key is not create');
    }

    let urlB64ToUint8Array = function (base64String) {
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

    let _subscribeUser = function () {
        const applicationServerKey = urlB64ToUint8Array(_applicationServerPublicKey);

        _swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        }).then(function (subscription) {
            console.log('User is subscribed.');
            _subscription = subscription;
            _subscriptionData = JSON.parse(JSON.stringify(_subscription));
            $.ajax({
                url: serverURL + regURL,
                dataType: "json",
                type: 'post',
                data: {
                    "endpoint": _subscriptionData.endpoint,
                    "expirationTime": _subscriptionData.expirationTime,
                    "p256dh": _subscriptionData.keys.p256dh,
                    "auth": _subscriptionData.keys.auth,
                    'PublicKey': _key.publicKey
                },
                success: function (result) {
                    console.log(result);
                }
            });
        }).catch(function (err) {
            console.log('Failed to subscribe the user: ', err);
            console.log(err);
            _unsubscribeUser();
        });
    }

    let _unsubscribeUser = function () {
        if (_swRegistration !== null) {
            _swRegistration.pushManager.getSubscription().then(function (subscription) {
                if (subscription) {
                    console.log(subscription);
                    $.ajax({
                        url: serverURL + keyDelURL,
                        dataType: "json",
                        type: 'post',
                        data: {
                            "endpoint": subscription.endpoint,
                            "PublicKey": _key.publicKey
                        },
                        success: function (result) {
                            console.log(result);
                        }
                    });
                    return subscription.unsubscribe();
                }
            }).catch(function (error) {
                console.log('Error unsubscribing', error);
            }).then(function () {
                console.log('User is unsubscribed.');
            });
        }
        // 자동 재시작
        if (_isSubscribed) {
            _subscribeUser();
        }
    }

    let _pushStart = function (isStart) {
        _isSubscribed = isStart;
        if (_isSubscribed) {
            $.ajax({
                async: false,
                url: serverURL + keyURL,
                dataType: "json",
                type: 'post',
                success: function (result) {
                    _key = result;
                    _applicationServerPublicKey = result.publicKey;
                }
            });
            _subscribeUser();
            _sendSWmsg(_key);
        } else {
            _unsubscribeUser();
        }
    }

    let _checkSubscription = function (btnConfirm, btnCancel) {

        if (arguments[1] !== void 0) {
            if ((_key.publicKey !== void 0) && (_key.endpoint === "endpoint")) {
                btnConfirm.disabled = true;
                btnCancel.disabled = false;
                btnConfirm.textContent = "구독중";
            } else {
                btnConfirm.disabled = false;
                btnConfirm.textContent = "구독하기";
                btnCancel.disabled = true;
            }
        } else {
            if ((_key.publicKey !== void 0) && (_key.endpoint === "endpoint")) {
                btnConfirm.disabled = true;
                btnConfirm.textContent = "구독중"
            } else {
                btnConfirm.disabled = false;
                btnConfirm.textContent = "구독하기";
            }
        }
    }

    let _getSwRegistration = function () {
        return _swRegistration;
    }

    let _sendSWmsg = function (data) {
        if (Array.isArray(data)) {
            _swRegistration.active.postMessage("arr" + JSON.stringify(data));
        } else if (typeof (data) === "object") {
            _swRegistration.active.postMessage("obj" + JSON.stringify(data));
        } else {
            _swRegistration.active.postMessage(data);
        }
    }

    return {
        pushStart: function (isStart) {
            _pushStart(isStart);
        },
        checkSubscription: function (btnConfirm, btnCancel) {
            _checkSubscription(btnConfirm, btnCancel);
        },
        getSwRegistration: function () {
            return _getSwRegistration();
        },
        sendSWmsg: function (data) {
            _sendSWmsg(data);
        }
    }

}());