# nem-payment
nem-payment test site

# How to use

```
<div id="nem-payment" amount="100" address="NBBNC2K72UDIN5HMRAEUWJ4F22RZPQL2LYONUDET" callback="http://example.com" data="test"></div>

<script src="nem-payment.js"></script>
```

# Attribules

+ amount(required): amout of require xem
+ address(required): address of recieve address
+ callback(required): wthen paied the xem, the transaction infomation post to callback
+ data(optional): this value send with transaction infomation
+ test(optional): when the value is "true" nem testnet is used

# Callback Transaction infomation

+ transaction
+ meta
+ testnetFlag
+ receiveAddress
+ receiveAmount
+ magicMessage
+ startTimeStamp
+ optionDatasets

# DEMO SITE
http://nem-payment.herokuapp.com/
