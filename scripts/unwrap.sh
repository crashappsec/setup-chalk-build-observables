#!/usr/bin/env sh

echo "Checking if we need to auto unwrap..."
if [ "${CURIOSITY_AUTOUNWRAP:-}" != "1" ]; then
    echo "We don't need to auto unwrap"
    exit 0
else
    echo "We will autounwrap"
fi


# Forcing to always unwrap
ls -hlia /mnt/curiosity
REFCOUNT_FILE="/mnt/curiosity/refcount.txt"
echo "1" > "$REFCOUNT_FILE"

echo "Will check if refcount file exists..."
if [ ! -f "$REFCOUNT_FILE" ]; then
    echo "No refcount file found...Will exit"
    exit 0
fi

echo "refcount file found...Will check if it's time to unwrap"

flock "$REFCOUNT_FILE" sh -c '
     am_i_root(){
        local rval=$(whoami)
        echo "$rval"
        if [ "$rval" = "root" ]; then
            return 0
        fi
        return 1
    }

    can_i_sudo(){
        SUDO=$(command -v sudo)
        "$SUDO" ls / > /dev/null 2>&1
        if [ "$?" -eq 0 ]; then
            return 0
        fi
        return 1
    }

    SUDO=
    am_i_root
    if [ "$?" -ne 0 ]; then
        echo "I am not root"
        can_i_sudo
        if [ "$?" -ne 0 ]; then
            echo "I cannot sudo"
            return
        fi
        echo "I can sudo: $SUDO"
    fi

    file="$1"
    read value < "$file"
    value=$((value - 1))

    if [ "$value" -ne "0" ]; then
        echo "Decrement value to $value" 
        echo "$value" > "$file"
    else
        echo "Time to unwrap"
        echo "$SUDO"
        ls -hlia /usr/bin/runc
        ls -hlia /usr/bin/runc.bkp
        "$SUDO" mv /usr/bin/runc.bkp /usr/bin/runc
        ls -hlia /usr/bin/runc

        ls -hlia  /mnt/curiosity/docker-buildx.bkp
        ls -hlia  /usr/libexec/docker/cli-plugins/docker-buildx
        "$SUDO" mv /mnt/curiosity/docker-buildx.bkp /usr/libexec/docker/cli-plugins/docker-buildx
        ls -hlia  /usr/libexec/docker/cli-plugins/docker-buildx
    fi
' _ "$REFCOUNT_FILE"
