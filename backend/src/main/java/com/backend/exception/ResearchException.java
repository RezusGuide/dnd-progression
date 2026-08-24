package com.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

// Not-found spells/characters and validation failures (e.g. insufficient
// aspects) all go through here - 400 fits the validation cases better
// than a bare 500, and there's no dedicated NotFoundException in this
// codebase to split them out.
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ResearchException extends RuntimeException {
    public ResearchException(String message) {
        super(message);
    }
}
