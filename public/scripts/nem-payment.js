var NemPayment = {};

(function(ns) {
  WATCH_INTERVAL_MSEC = 500;

  ns.conformed = false;

  ns.paymentForm = {};
  ns.receiveAddress = "";
  ns.amount = 0;

  ns.testnetFlag = false;
  ns.callback = "";
  ns.optionDatasets = "";

  ns.magicMessage = "";
  ns.timeStamp = 0;

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
    ns.magicMessage = ns.randomstr(5);
    ns.timeStamp = ns.getUnixTime();

    var qrcodeImg = ns.makeQrCodeImage();
    ns.paymentForm.appendChild(qrcodeImg);

    var paymentInfomation = ns.makePaymentInfomation(false);
    ns.paymentForm.appendChild(paymentInfomation);

    ns.setTransactionCheck();
  });

  ns.setTransactionCheck = function() {
    var hexMagicMessage = ns.textToHex(ns.magicMessage);

    var url = "http://bob.nem.ninja:7890/account/transfers/incoming?address="
    url += ns.receiveAddress;

    fetch(url).then(function(response) {
      return response.json();
    }).then(function(json) {
      var transactions = json["data"];

      Object.keys(transactions).forEach(function (key) {
        tx = transactions[key];

        if(ns.conformed) { return; }

        var txTimeStamp = tx["transaction"]["timeStamp"];
        if(txTimeStamp > ns.timeStamp) { return; }

        var receiveAmount = Number(tx["transaction"]["amount"]) / 1000000;
        if(receiveAmount < ns.amount) { return; }

        if(!tx["transaction"]["message"]) { return; }
        var txHexMessage = tx["transaction"]["message"]["payload"];

        if(txHexMessage == hexMagicMessage) {
          ns.conformed = true;
          ns.senderPublicKey = tx["transaction"]["signer"];
          ns.txHash = tx["meta"]["hash"]["data"];
          ns.receiveAmount = receiveAmount;
          ns.paymentConfored(tx);
        }
      });
    });

    if(!ns.conformed) {
      setTimeout(ns.setTransactionCheck, WATCH_INTERVAL_MSEC);
    }
  };

  ns.paymentConfored = function(tx) {
    ns.paymentForm.textContent = null;

    var conformedMessagePragraph = document.createElement('p');
    conformedMessagePragraph.textContent = "Conformed!";
    ns.paymentForm.appendChild(conformedMessagePragraph);

    var paymentInfomation = ns.makePaymentInfomation(true);
    ns.paymentForm.appendChild(paymentInfomation);

    ns.doCallback(tx);
  }

  ns.doCallback = function(tx){
    var url = ns.callback;
    data = {
      "transaction": tx["transaction"],
      "meta": tx["meta"],
      "testnetFlag": ns.testnetFlag,
      "receiveAddress": ns.receiveAddress,
      "receiveAmount": ns.receiveAmount,
      "magicMessage": ns.magicMessage,
      "startTimeStamp": ns.timeStamp,
      "optionDatasets": ns.optionDatasets
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    console.log(data);
  }

  ns.makeQrCodeImage = function() {
    var version = 2;  // 1 - testnet / 2 - livenet
    if(ns.testnetFlag) { version = 1; }

    var microAmount = ns.amount * 1000000;

    var qrCodeData = JSON.stringify({
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
    qrcodeUri += size + "x" + size + "&chl=" + qrCodeData;
    qrcodeImg.src = qrcodeUri
    return(qrcodeImg)
  }

  ns.makePaymentInfomation = function(conformed) {
    if (conformed == null) {
        conformed = false;
    }
    var infomationDiv = document.createElement('div');

    var addressParagraph = document.createElement('p');
    var amountParagraph = document.createElement('p');
    var magicMessageParagraph = document.createElement('p');
    var txHashParagraph = document.createElement('p');
    var senderPublicKeyPragraph = document.createElement('p');

    var addressText = "Reception Address: " + ns.receiveAddress;
    if(ns.testnetFlag) {
      addressText += " (testnet)";
    }

    addressParagraph.textContent = addressText;
    amountParagraph.textContent = "Require Amount: " + ns.amount;
    magicMessageParagraph.textContent = "Magic Message: " + ns.magicMessage;
    txHashParagraph.textContent = "Tx Hash: " + ns.txHash;
    senderPublicKeyPragraph.textContent = "Sender PublicKey: " + ns.senderPublicKey;

    infomationDiv.appendChild(addressParagraph);
    infomationDiv.appendChild(amountParagraph);
    infomationDiv.appendChild(magicMessageParagraph);
    if(conformed) {
      infomationDiv.appendChild(txHashParagraph);
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
