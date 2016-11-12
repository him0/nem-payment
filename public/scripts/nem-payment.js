var NemPayment = {};

(function(ns) {
  WATCH_INTERVAL_MSEC = 1000;

  ns.pending = false;
  ns.confirmed = false;

  ns.paymentForm = {};
  ns.qrcodeImg = {};
  ns.paymentInfomation = {};

  ns.receiveAddress = "";
  ns.amount = 0;
  ns.testnetFlag = false;
  ns.callback = "";
  ns.optionDatasets = "";

  ns.magicMessage = "";
  ns.startTimeStamp = 0;

  ns.txHash = "";
  ns.senderPublicKey = "";
  ns.receiveAmount = 0;

  document.addEventListener("DOMContentLoaded", function(event) {
    ns.paymentForm = document.getElementById("nem-payment");
    if(!ns.paymentForm) {
      console.log("There is not #nem-payment on document.")
    };

    ns.receiveAddress = ns.paymentForm.getAttribute("address");
    ns.amount = Number(ns.paymentForm.getAttribute("amount"));
    if(ns.paymentForm.getAttribute("test") == "true") {
      ns.testnetFlag = true;
    }
    ns.callback = ns.paymentForm.getAttribute("callback");
    ns.optionDatasets = ns.paymentForm.getAttribute("data");

    ns.magicMessage = ns.randomstr(5);
    ns.startTimeStamp = ns.getUnixTime();

    ns.qrcodeImg = ns.makeQrcodeImage();
    ns.paymentForm.appendChild(ns.qrcodeImg);

    ns.paymentInfomation = ns.makePaymentInfomation();
    ns.paymentForm.appendChild(ns.paymentInfomation);

    ns.setTransactionCheck();
  });

  ns.setTransactionCheck = function() {
    if(!ns.pending && !ns.confirmed) { ns.unconfirmedTransactionCheck(); }
    ns.confirmedTransactionCheck();

    if(!ns.confirmed) {
      setTimeout(ns.setTransactionCheck, WATCH_INTERVAL_MSEC);
    }
  };

  ns.unconfirmedTransactionCheck = function() {
    var url = "http://"
    url += ns.testnetFlag ? "bob.nem.ninja" : "go.nem.ninja"
    url += ":7890/account/unconfirmedTransactions?address="
    url += ns.receiveAddress;

    fetch(url).then(function(response) {
      return response.json();
    }).then(function(json) {
      var transactions = json["data"];

      Object.keys(transactions).forEach(function (key) {
        tx = transactions[key];

        if(ns.pending) { return; }
        if(ns.confirmed) { return; }

        ns.matchTransaction(tx, function(){
          console.log("pending");
          ns.pending = true;

          ns.senderPublicKey = tx["transaction"]["signer"];
          ns.receiveAmount = Number(tx["transaction"]["amount"]) / 1000000;

          ns.paymentForm.textContent = null;
          ns.paymentInfomation = ns.makePaymentInfomation();
          ns.paymentForm.appendChild(ns.paymentInfomation);
        });
      });
    });
  };

  ns.confirmedTransactionCheck = function() {
    var url = "http://"
    url += ns.testnetFlag ? "bob.nem.ninja" : "go.nem.ninja"
    url += ":7890/account/transfers/incoming?address="
    url += ns.receiveAddress;

    fetch(url).then(function(response) {
      return response.json();
    }).then(function(json) {
      var transactions = json["data"];

      Object.keys(transactions).forEach(function (key) {
        tx = transactions[key];

        if(ns.confirmed) { return; }

        ns.matchTransaction(tx, function(){
          console.log("confirmed");
          ns.confirmed = true;

          ns.txHash = tx["meta"]["hash"]["data"];
          ns.senderPublicKey = tx["transaction"]["signer"];
          ns.receiveAmount = Number(tx["transaction"]["amount"]) / 1000000;

          ns.paymentForm.textContent = null;
          ns.paymentInfomation = ns.makePaymentInfomation();
          ns.paymentForm.appendChild(ns.paymentInfomation);
          ns.excuteCallback(tx);
        });
      });
    });
  };

  ns.matchTransaction = function(tx, callback) {
    var txTimeStamp = tx["transaction"]["timeStamp"];
    if(txTimeStamp > ns.startTimeStamp) { return; }

    var receiveAmount = Number(tx["transaction"]["amount"]) / 1000000;
    if(receiveAmount < ns.amount) { return; }

    if(!tx["transaction"]["message"]) { return; }

    var txHexMessage = tx["transaction"]["message"]["payload"];
    var hexMagicMessage = ns.textToHex(ns.magicMessage);
    if(txHexMessage == hexMagicMessage) {
      callback();
    }
  };

  ns.excuteCallback = function(tx){
    var url = ns.callback;
    data = {
      "transaction": tx["transaction"],
      "meta": tx["meta"],
      "testnetFlag": ns.testnetFlag,
      "receiveAddress": ns.receiveAddress,
      "receiveAmount": ns.receiveAmount,
      "magicMessage": ns.magicMessage,
      "startTimeStamp": ns.startTimeStamp,
      "optionDatasets": ns.optionDatasets
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    console.log(data);
  }

  ns.makeQrcodeImage = function() {
    var version = 2;  // 1 - testnet / 2 - livenet
    if(ns.testnetFlag) { version = 1; }

    var microAmount = ns.amount * 1000000;

    var qrcodeData = JSON.stringify({
      "v": version,
      "type": 2,
      "data": {
        "addr": ns.receiveAddress,
        "testnetFlag": ns.testnetFlag,
        "senderAddress": ns.senderAddress,
        "amount": microAmount,
        "msg": ns.magicMessage,
        "name": "NEM Payment"
      }
    });

    var qrcodeImg = document.createElement('img');
    var size = 256;
    var qrcodeUri = "http://chart.apis.google.com/chart?cht=qr&chs="
    qrcodeUri += size + "x" + size + "&chl=" + qrcodeData;
    qrcodeImg.src = qrcodeUri
    return(qrcodeImg)
  }

  ns.makePaymentInfomation = function() {
    var infomationDiv = document.createElement('div');

    var statusParagraph = document.createElement('p');
    var addressParagraph = document.createElement('p');
    var amountParagraph = document.createElement('p');
    var magicMessageParagraph = document.createElement('p');
    var txHashParagraph = document.createElement('p');
    var senderPublicKeyPragraph = document.createElement('p');

    var statusText = "Status: accepting";
    if(ns.pending) { statusText = "Status: Pending"; }
    if(ns.confirmed) { statusText = "Status: Confirmed"; }
    statusParagraph.textContent = statusText;
    infomationDiv.appendChild(statusParagraph);

    var addressText = "Reception Address: " + ns.receiveAddress;
    if(ns.testnetFlag) { addressText += " (testnet)"; }
    addressParagraph.textContent = addressText;
    infomationDiv.appendChild(addressParagraph);

    amountParagraph.textContent = "Require Amount: " + ns.amount;
    infomationDiv.appendChild(amountParagraph);

    magicMessageParagraph.textContent = "Message for Identify Your Transaction: " + ns.magicMessage;
    infomationDiv.appendChild(magicMessageParagraph);

    if(ns.pending || ns.confirmed) {
      txHashParagraph.textContent = "Tx Hash: " + ns.txHash;
      infomationDiv.appendChild(txHashParagraph);

      var senderPublicKey = "Sender PublicKey: " + ns.senderPublicKey;
      senderPublicKeyPragraph.textContent = senderPublicKey;
      infomationDiv.appendChild(senderPublicKeyPragraph);
    }

    return(infomationDiv);
  }

  ns.randomstr = function(length) {
    var s = "";
    length = length || 32;
    for (i = 0; i < length; i++) {
      s += Math.random().toString(36).substr(-2, 1);
    }
    return s;
  };

  ns.textToHex = function(str) {
    var str = str.toString();
  	var hex = '';
  	for(var i=0; i<str.length; i++) {
  		hex += '' + str.charCodeAt(i).toString(16);
  	}
  	return hex;
  };

  ns.getUnixTime = function() {
    var date = new Date();
    var unixTimestamp = date.getTime();
    var unixTimestamp = Math.floor(date.getTime() / 1000);
    return unixTimestamp;
  };
})(NemPayment);
