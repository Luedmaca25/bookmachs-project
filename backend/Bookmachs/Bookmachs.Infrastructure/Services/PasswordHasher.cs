using System;
using System.Security.Cryptography;
using Bookmachs.Application.Common.Interfaces;

namespace Bookmachs.Infrastructure.Services;

public class PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16; // 128-bit
    private const int KeySize = 32;  // 256-bit (SHA256 output length)
    private const int Iterations = 100000;
    private static readonly HashAlgorithmName HashAlgorithm = HashAlgorithmName.SHA256;

    public string HashPassword(string password)
    {
        using var algorithm = new Rfc2898DeriveBytes(
            password,
            SaltSize,
            Iterations,
            HashAlgorithm);

        var key = algorithm.GetBytes(KeySize);
        var salt = algorithm.Salt;

        var bytes = new byte[SaltSize + KeySize];
        Array.Copy(salt, 0, bytes, 0, SaltSize);
        Array.Copy(key, 0, bytes, SaltSize, KeySize);

        return Convert.ToBase64String(bytes);
    }

    public bool VerifyPassword(string password, string hashedPassword)
    {
        try
        {
            var bytes = Convert.FromBase64String(hashedPassword);
            
            var salt = new byte[SaltSize];
            var key = new byte[KeySize];

            Array.Copy(bytes, 0, salt, 0, SaltSize);
            Array.Copy(bytes, SaltSize, key, 0, KeySize);

            using var algorithm = new Rfc2898DeriveBytes(
                password,
                salt,
                Iterations,
                HashAlgorithm);

            var verifiedKey = algorithm.GetBytes(KeySize);

            // Comparación en tiempo constante para evitar ataques de canal lateral (Timing Attacks)
            return CryptographicOperations.FixedTimeEquals(key, verifiedKey);
        }
        catch
        {
            return false;
        }
    }
}
