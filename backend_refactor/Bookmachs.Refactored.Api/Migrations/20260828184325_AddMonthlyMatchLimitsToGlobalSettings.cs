using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Refactored.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMonthlyMatchLimitsToGlobalSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MonthlyMatchLimitFree",
                table: "GlobalSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MonthlyMatchLimitPremium",
                table: "GlobalSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MonthlyMatchLimitFree",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "MonthlyMatchLimitPremium",
                table: "GlobalSettings");
        }
    }
}
