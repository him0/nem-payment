require 'sinatra'
require 'sinatra/reloader'

require 'json'
require 'twitter'
require 'rest-client'

RECEIVE_ADDRESS = ENV["RECEIVE_ADDRESS"]
AMOUNT = ENV["AMOUNT"]
TESTNET = ENV["TESTNET"] # 1: testnet, 0: livenet

CLIENT = Twitter::REST::Client.new do |config|
  config.consumer_key        = ENV["CONSUMER_KEY"]
  config.consumer_secret     = ENV["CONSUMER_SECRET"]
  config.access_token        = ENV["ACCESS_TOKEN"]
  config.access_token_secret = ENV["ACCESS_SECRET"]
end

get '/' do
  @receive_address = RECEIVE_ADDRESS
  @amount = AMOUNT
  @testnet = TESTNET == "1" ? true : false
  puts @testnet
  erb :index
end

post '/callback' do
  params = JSON.parse(request.body.read)
  tweet_pyament_infomation(params)
end

def tweet_pyament_infomation(params)
  puts params
  is_testnet = params["testnetFlag"]
  tx_hash = params["meta"]["hash"]["data"]
  receive_amount = params["receiveAmount"]

  transaction_validate_result = validate_transaction(params)

  message  = "Payment Accpet! (" + Time.now.to_s + ")\n"
  message  += "Amount: " + receive_amount.to_s + " xem\n"
  message += "Validate result: " + transaction_validate_result.to_s + "\n"

  if(is_testnet)
    message += "Type: Testnet Transaction\n"
    message += "Tx: http://bob.nem.ninja:8765/#/transfer/" + tx_hash + "\n"
  else
    message += "Type: Livenet Transaction\n"
    message += "Tx: http://chain.nem.ninja/#/transfer/" + tx_hash + "\n"
  end

  puts message
  CLIENT.update(message)
end

def validate_transaction(params)
  url = "http://"
  url += TESTNET == "1" ? "bob.nem.ninja" : "go.nem.ninja"
  url += ":7890/account/transfers/incoming?address="
  url += RECEIVE_ADDRESS
  transactions = JSON.parse(RestClient.get(url))["data"]
  target_tx = nil

  transactions.each do |tx|
    if(tx["meta"]["hash"]["data"] == params["meta"]["hash"]["data"])
      target_tx = tx
    end
  end
  return false if target_tx == nil
  return false if target_tx["meta"] != params["meta"]
  return false if target_tx["transaction"] != params["transaction"]
  return true
end
