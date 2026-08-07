#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <SoftwareSerial.h>
#include <PN532_SWHSU.h>
#include <PN532.h>
#include <emulatetag.h>

// ====================================================================
// WiFi Credentials
// ====================================================================
const char* ssid = "hari-Vostro-3520";
const char* password = "Harshi@$2903";

// ====================================================================
// Backend API Endpoint & Device Credentials
// ====================================================================
const char* serverUrl = "http://192.168.137.1:5000/api/v1/checkin";
const char* deviceId = "dev-3f9c1a2b";
const char* apiKey = "ak_live_device_secret_key";

// ====================================================================
// PN532 Setup (NO PIN CHANGES)
// SoftwareSerial RX=D5(GPIO14), TX=D6(GPIO12)
// ====================================================================
SoftwareSerial SWSerial(14, 12);   // RX=D5(GPIO14), TX=D6(GPIO12)

PN532_SWHSU pn532swhsu(SWSerial);
PN532 nfc(pn532swhsu);
EmulateTag emulator(pn532swhsu);

bool emulateMode = false;

void connectWiFi()
{
    Serial.print("Connecting to WiFi: ");
    Serial.println(ssid);

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.println("WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
}

/**
 * Sends the scanned NFC UID to CampusOS backend API via HTTP POST.
 * Triggers backend check-in, phone lock FCM push, and live Socket.IO auto-fill.
 */
void sendNfcUidToBackend(String uidFormatted)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[HTTP] Cannot send UID - WiFi disconnected");
        return;
    }

    WiFiClient client;
    HTTPClient http;

    Serial.print("[HTTP] Connecting to CampusOS Backend: ");
    Serial.println(serverUrl);

    // Configure client with explicit timeout
    client.setTimeout(3000);

    if (http.begin(client, serverUrl))
    {
        http.setTimeout(3000);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("x-api-key", apiKey);
        http.addHeader("Connection", "close");

        // Construct JSON Payload
        String jsonPayload = "{\"nfcUid\":\"" + uidFormatted + "\",\"deviceId\":\"" + String(deviceId) + "\"}";

        Serial.print("[HTTP] POST Payload: ");
        Serial.println(jsonPayload);

        int httpCode = http.POST(jsonPayload);

        if (httpCode > 0)
        {
            Serial.printf("[HTTP] POST Response Code: %d\n", httpCode);
            String responseStr = http.getString();
            Serial.print("[HTTP] Server Response: ");
            Serial.println(responseStr);

            if (httpCode == 200)
            {
                Serial.println("[SUCCESS] Card UID recorded & auto-filled in CampusOS!");
            }
        }
        else
        {
            Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
        }

        http.end();
    }
    else
    {
        Serial.println("[HTTP] Unable to connect to backend server");
    }
}

void setup()
{
    Serial.begin(115200);
    SWSerial.begin(115200);

    Serial.println();
    Serial.println("=== CampusOS Smart NFC Door Reader Booting ===");

    // Connect to WiFi
    connectWiFi();

    Serial.println("Initializing PN532 NFC Module...");

    nfc.begin();

    uint32_t version = nfc.getFirmwareVersion();

    if (!version)
    {
        Serial.println("PN532 NOT FOUND - Please check hardware wiring!");

        while (1);
    }

    Serial.print("PN532 Firmware Version: ");
    Serial.print((version >> 24) & 0xFF);
    Serial.print(".");
    Serial.println((version >> 16) & 0xFF);

    nfc.SAMConfig();

    Serial.println("Ready to scan NFC cards/tags...");
}

void loop()
{
    // Reconnect if WiFi drops
    if (WiFi.status() != WL_CONNECTED)
    {
        connectWiFi();
    }

    if (Serial.available())
    {
        char c = Serial.read();

        if (c == 'E')
        {
            emulateMode = true;
            Serial.println("Entering Emulation Mode");
        }

        if (c == 'R')
        {
            emulateMode = false;
            Serial.println("Entering Reader Mode");
            nfc.SAMConfig();
        }
    }

    if (emulateMode)
    {
        emulator.emulate();
        return;
    }

    uint8_t uid[7];
    uint8_t uidLength;

    if (nfc.readPassiveTargetID(
            PN532_MIFARE_ISO14443A,
            uid,
            &uidLength))
    {
        String uidStr = "";
        Serial.print("Card Scanned UID: ");

        for (int i = 0; i < uidLength; i++)
        {
            if (uid[i] < 16)
            {
                Serial.print("0");
                uidStr += "0";
            }

            Serial.print(uid[i], HEX);
            uidStr += String(uid[i], HEX);
            Serial.print(" ");
        }

        Serial.println();
        uidStr.toUpperCase();

        // Send UID to backend API
        sendNfcUidToBackend(uidStr);

        delay(1500); // Debounce scan
    }
}
