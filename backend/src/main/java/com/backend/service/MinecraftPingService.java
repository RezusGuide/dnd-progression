package com.backend.service;

import com.backend.model.MinecraftStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/**
 * Minecraft's "Server List Ping" protocol (the same handshake the vanilla
 * client's multiplayer server list uses) - a raw TCP round-trip, no
 * external status API involved. Handshake (state=status) + status request,
 * then read back a length-prefixed JSON payload.
 * Protocol reference: wiki.vg/Server_List_Ping.
 */
@Service
public class MinecraftPingService {

    private static final int TIMEOUT_MS = 3000;

    // Instantiated directly rather than injected - same reasoning as
    // SpellRegistry/CombatService: this project's auto-configured Jackson
    // bean is the Jackson 3 tools.jackson.databind.ObjectMapper, not this
    // classic com.fasterxml.jackson.databind.ObjectMapper.
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MinecraftStatus ping(String host, int port) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            DataOutputStream out = new DataOutputStream(socket.getOutputStream());
            DataInputStream in = new DataInputStream(socket.getInputStream());

            // Handshake packet (id 0x00): protocol version, server address,
            // server port, next state (1 = status).
            ByteArrayOutputStream handshake = new ByteArrayOutputStream();
            writeVarInt(handshake, 0x00);
            writeVarInt(handshake, -1);
            writeString(handshake, host);
            handshake.write((port >> 8) & 0xFF);
            handshake.write(port & 0xFF);
            writeVarInt(handshake, 1);
            writePacket(out, handshake.toByteArray());

            // Status request packet (id 0x00, empty body).
            writePacket(out, new byte[]{0x00});

            readVarInt(in); // total packet length - unused, we just read the fields we need
            readVarInt(in); // packet id (0x00 for status response)
            int jsonLength = readVarInt(in);
            byte[] jsonBytes = new byte[jsonLength];
            in.readFully(jsonBytes);

            return parseStatus(new String(jsonBytes, StandardCharsets.UTF_8));
        } catch (Exception e) {
            // Anything - refused connection, timeout, malformed response -
            // just reads as "offline". This is a best-effort live indicator,
            // not something a caller should have to handle exceptions for.
            return MinecraftStatus.offline();
        }
    }

    private MinecraftStatus parseStatus(String json) throws IOException {
        JsonNode root = objectMapper.readTree(json);

        Integer online = root.path("players").path("online").isInt() ? root.path("players").path("online").asInt() : null;
        Integer max = root.path("players").path("max").isInt() ? root.path("players").path("max").asInt() : null;
        String version = root.path("version").path("name").asText(null);

        JsonNode descriptionNode = root.path("description");
        String description;
        if (descriptionNode.isTextual()) {
            description = descriptionNode.asText();
        } else if (descriptionNode.has("text")) {
            description = descriptionNode.path("text").asText("");
        } else {
            description = descriptionNode.isMissingNode() ? null : descriptionNode.toString();
        }

        return MinecraftStatus.builder()
                .online(true)
                .playersOnline(online)
                .playersMax(max)
                .version(version)
                .motd(description)
                .build();
    }

    private void writeVarInt(OutputStream out, int value) throws IOException {
        while (true) {
            if ((value & ~0x7F) == 0) {
                out.write(value);
                return;
            }
            out.write((value & 0x7F) | 0x80);
            value >>>= 7;
        }
    }

    private int readVarInt(InputStream in) throws IOException {
        int value = 0;
        int position = 0;
        while (true) {
            int b = in.read();
            if (b < 0) throw new EOFException("Connection closed while reading VarInt");
            value |= (b & 0x7F) << position;
            if ((b & 0x80) == 0) break;
            position += 7;
            if (position >= 32) throw new IOException("VarInt too big");
        }
        return value;
    }

    private void writeString(OutputStream out, String s) throws IOException {
        byte[] bytes = s.getBytes(StandardCharsets.UTF_8);
        writeVarInt(out, bytes.length);
        out.write(bytes);
    }

    private void writePacket(OutputStream out, byte[] data) throws IOException {
        writeVarInt(out, data.length);
        out.write(data);
    }
}
