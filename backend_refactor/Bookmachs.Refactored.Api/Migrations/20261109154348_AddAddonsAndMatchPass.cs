using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Refactored.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAddonsAndMatchPass : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "BooksBoostedUntil",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ExtraCatalogSearchesGranted",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "MatchPassUntil",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalSwipesLifetime",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UnlimitedLikesUntil",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MatchPassPromoMinInterestedThreshold",
                table: "GlobalSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MatchPassPromoSwipesThreshold",
                table: "GlobalSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceAuthorSearches10",
                table: "GlobalSettings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceBookBoost48h",
                table: "GlobalSettings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceMatchPassDayPromo",
                table: "GlobalSettings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceMatchPassWeek",
                table: "GlobalSettings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePremium24h",
                table: "GlobalSettings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceUnlimitedLikes24h",
                table: "GlobalSettings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "BoostedUntil",
                table: "Books",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "UserAddonPurchases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddonType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    BuyOrder = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PaymentStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TargetBookId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAddonPurchases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserAddonPurchases_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserAddonPurchases_BuyOrder",
                table: "UserAddonPurchases",
                column: "BuyOrder");

            migrationBuilder.CreateIndex(
                name: "IX_UserAddonPurchases_UserId_AddonType",
                table: "UserAddonPurchases",
                columns: new[] { "UserId", "AddonType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserAddonPurchases");

            migrationBuilder.DropColumn(
                name: "BooksBoostedUntil",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ExtraCatalogSearchesGranted",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MatchPassUntil",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TotalSwipesLifetime",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UnlimitedLikesUntil",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MatchPassPromoMinInterestedThreshold",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "MatchPassPromoSwipesThreshold",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "PriceAuthorSearches10",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "PriceBookBoost48h",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "PriceMatchPassDayPromo",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "PriceMatchPassWeek",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "PricePremium24h",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "PriceUnlimitedLikes24h",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "BoostedUntil",
                table: "Books");
        }
    }
}
