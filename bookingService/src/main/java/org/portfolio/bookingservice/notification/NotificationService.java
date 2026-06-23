package org.portfolio.bookingservice.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class NotificationService {

    // userId → SseEmitter (one connection per user)
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final Map<Long, String> userRoles = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long userId, String role) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        emitter.onCompletion(() -> { emitters.remove(userId); userRoles.remove(userId); });
        emitter.onTimeout(() -> { emitters.remove(userId); userRoles.remove(userId); });
        emitter.onError(e -> { emitters.remove(userId); userRoles.remove(userId); });

        emitters.put(userId, emitter);
        userRoles.put(userId, role);
        log.info("User {} ({}) subscribed to notifications ({} total)", userId, role, emitters.size());

        try {
            emitter.send(SseEmitter.event().name("connected").data("Notifications active"));
        } catch (IOException e) {
            emitters.remove(userId);
            userRoles.remove(userId);
        }

        return emitter;
    }

    public void notifyUser(Long userId, String event, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) return;

        try {
            emitter.send(SseEmitter.event().name(event).data(data));
        } catch (IOException e) {
            emitters.remove(userId);
            userRoles.remove(userId);
            log.warn("Removed stale emitter for user {}", userId);
        }
    }

    public void notifyAdmins(String event, Object data) {
        emitters.forEach((userId, emitter) -> {
            if ("ADMIN".equals(userRoles.get(userId))) {
                try {
                    emitter.send(SseEmitter.event().name(event).data(data));
                } catch (IOException e) {
                    emitters.remove(userId);
                    userRoles.remove(userId);
                }
            }
        });
    }

    public void broadcast(String event, Object data) {
        emitters.forEach((userId, emitter) -> {
            try {
                emitter.send(SseEmitter.event().name(event).data(data));
            } catch (IOException e) {
                emitters.remove(userId);
                userRoles.remove(userId);
            }
        });
    }
}
