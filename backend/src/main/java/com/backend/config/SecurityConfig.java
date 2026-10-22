package com.backend.config;

import com.backend.entity.Role;
import com.backend.service.JwtService;
import com.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    // Comma-separated list, e.g. "http://localhost:5173,https://your-app.vercel.app"
    @Value("${cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Carved out of the otherwise-permitAll /api/auth/** below -
                        // needs @AuthenticationPrincipal User to be non-null, so it
                        // must actually require a valid session. Declared first:
                        // Spring Security's authorizeHttpRequests takes the first
                        // matching rule, so this has to come before the broader
                        // permitAll or it would never be reached.
                        .requestMatchers(HttpMethod.POST, "/api/auth/recovery-code").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()

                        // Spring Boot forwards uncaught controller exceptions to /error
                        // internally to render the response. Without this, that internal
                        // dispatch falls through to .anyRequest().authenticated() below and
                        // gets rejected for anonymous callers - so instead of the real error
                        // status (400/404/500/...) they'd see an opaque, misleading 403.
                        .requestMatchers("/error").permitAll()

                        // Public read-only content - anyone, logged in or not, can view
                        // Announcements and the D&D area.
                        .requestMatchers(HttpMethod.GET, "/api/announcements/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/data/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/characters/**", "/api/campaigns/**", "/api/spells/**").permitAll()

                        // Any logged-in account (there's no per-friend section picking
                        // anymore - everyone with a login gets the same access) can CRUD
                        // the D&D area.
                        .requestMatchers("/api/characters/**", "/api/campaigns/**", "/api/spells/**").authenticated()

                        // Owner-only writes on otherwise-public content.
                        .requestMatchers(HttpMethod.POST, "/api/announcements/**").hasAuthority("SECTION_ALL")
                        .requestMatchers(HttpMethod.DELETE, "/api/announcements/**").hasAuthority("SECTION_ALL")

                        // Admin: bootstrap only needs auth (guarded in the service instead -
                        // it refuses once an owner exists); everything else needs OWNER.
                        .requestMatchers(HttpMethod.POST, "/api/admin/bootstrap-owner").authenticated()
                        .requestMatchers("/api/admin/**").hasRole("OWNER")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public OncePerRequestFilter jwtAuthFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain filterChain)
                    throws ServletException, IOException {

                String authHeader = request.getHeader("Authorization");
                if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                    filterChain.doFilter(request, response);
                    return;
                }

                String token = authHeader.substring(7);
                if (!jwtService.isTokenValid(token)) {
                    filterChain.doFilter(request, response);
                    return;
                }

                Long userId = jwtService.extractUserId(token);
                userRepository.findById(userId).ifPresent(user -> {
                    List<GrantedAuthority> authorities = new ArrayList<>();
                    for (Role role : user.getRoles()) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getKey()));
                        for (String section : role.getSections()) {
                            String authority = "*".equals(section)
                                    ? "SECTION_ALL"
                                    : "SECTION_" + section.toUpperCase();
                            authorities.add(new SimpleGrantedAuthority(authority));
                        }
                    }
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(user, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });

                filterChain.doFilter(request, response);
            }
        };
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public org.springframework.security.authentication.AuthenticationManager authenticationManager(
            org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }
}
