from werkzeug.security import check_password_hash, generate_password_hash #funcion para encriptar y comprobar contraseñas hash!

def password_hash(password):
    return generate_password_hash(password)#transforma nuestra funcion en un hash seguro para almacenar en la base de datos


def password_matches(password, hashed): #funcion que compara la contraseña ingresada con la contraseña encriptada en la base de datos
    return check_password_hash(hashed, password)


def required_text(value, field):
    value = str(value or "").strip()
    if not value:
        raise ValueError(f"{field} es obligatorio")
    return value